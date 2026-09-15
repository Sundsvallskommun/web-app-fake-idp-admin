import { csrfProtection } from '@middlewares/csrf.middleware';
import type { AddressInfo } from 'net';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import type { Server } from 'http';
import request from 'supertest';
import { registerIdpRoutes } from '../saml-idp/idp.routes';
import type { UserWithAttributes } from '../saml-idp/response-builder';
import type { OidcClientStore } from './client-store';
import { isAcceptableBrowsingOrigin, localTestClient, LocalFirstClientStore, LOCAL_TEST_CLIENT_ID } from './local-client';
import { registerOidcRoutes } from './oidc.routes';
import { registerOidcTestRoutes, testRpUrls } from './test-rp';

/**
 * The local test RP calls `/token`, `/jwks.json` and `/userinfo` over real HTTP at
 * OIDC_INTERNAL_URL — that back-channel is the point of the loop, so the test
 * stands a real listener up and points the RP at it. Only that one value is
 * mocked, as a getter, because the port is not known until the server is bound.
 */
const holder = vi.hoisted(() => ({ internalUrl: '' }));

vi.mock('@config', async importOriginal => {
  const actual = await importOriginal<typeof import('@config')>();
  return {
    ...actual,
    get OIDC_INTERNAL_URL() {
      return holder.internalUrl;
    },
  };
});

const identity: UserWithAttributes = {
  id: 'user-1',
  name: 'Test Person',
  username: 'test.person',
  password: 'test-password',
  attributes: [
    { id: 1, userId: 'user-1', key: 'givenName', format: 'basic', value: 'Test', type: 'xs:string' },
    { id: 2, userId: 'user-1', key: 'citizenIdentifier', format: 'basic', value: '196001011234', type: 'xs:string' },
  ],
  groups: [{ id: 1, name: 'developers', description: '' }],
};

const usersService = {
  getUser: vi.fn(async (id: string) => (id === identity.id ? identity : null)),
  getUsers: vi.fn(async () => [identity]),
  getUsersByUsername: vi.fn(async (username: string) => (username === identity.username ? [identity] : [])),
};

// Nothing but the built-in client is registered — exactly the state of a freshly
// created database, which is what `docker compose up` produces.
const emptyStore: OidcClientStore = { getClient: vi.fn(async () => null) };

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto' },
  }),
);
app.use(csrfProtection);
registerIdpRoutes(app, usersService);
registerOidcRoutes(app, usersService, new LocalFirstClientStore(emptyStore));
registerOidcTestRoutes(app);
// Express requires arity 4 for an error handler — _next must stay unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(error.status ?? 500).send(error.message);
});

let server: Server;
/**
 * Every request goes through ONE listening server, addressed by URL.
 * `client()` would bind a fresh ephemeral port per request, so `Host` — and
 * therefore the browsing origin the redirect URI is built from — would change
 * mid-flow. A browser never does that, and modelling it here made the test fail
 * on something that cannot happen.
 */
let baseUrl: string;

/** Lazily bound: the port is not known until beforeAll has run. */
const client = () => request(baseUrl);
const browser = () => request.agent(baseUrl);

beforeAll(async () => {
  server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  holder.internalUrl = `${baseUrl}/api/oidc`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
});

const csrfTokenFrom = (html: string): string => {
  const token = html.match(/name="_csrf" value="([^"]+)"/)?.[1];
  if (!token) {
    throw new Error('Missing CSRF token in IdP page');
  }
  return token;
};

/** Locations may be relative or absolute; supertest addresses the app by path. */
const asPath = (location: string): string => {
  const url = new URL(location, baseUrl);
  return `${url.pathname}${url.search}`;
};

/** Walk the browser half of the flow by hand: login -> authorize -> pick -> callback. */
const runTestFlow = async (agent: ReturnType<typeof request.agent>) => {
  const start = await agent.get('/api/oidc/test/login').expect(303);
  const authorize = await agent.get(asPath(start.headers.location)).expect(303);

  expect(authorize.headers.location).toBe('/api/saml/idp/login');
  const page = await agent.get('/api/saml/idp/login').expect(200);
  const authenticated = await agent
    .post('/api/saml/idp/authenticate')
    .type('form')
    .send({ userid: identity.id, _csrf: csrfTokenFrom(page.text) })
    .expect(303);

  const callback = await agent.get(asPath(authenticated.headers.location)).expect(303);
  return { callbackLocation: callback.headers.location as string };
};

describe('built-in local test client', () => {
  it('resolves without a database row so the loop works on an empty install', async () => {
    const store = new LocalFirstClientStore(emptyStore);
    const client = await store.getClient(LOCAL_TEST_CLIENT_ID);

    expect(client).toMatchObject({ clientId: LOCAL_TEST_CLIENT_ID, isPublic: true, requirePkce: true });
    expect(client?.redirectUris).toEqual(['https://fake-idp.test/api/oidc/test/callback']);
  });

  // The operator can reach this backend on more than one origin — the proxy port
  // and the backend container's own port. Anchoring to the issuer origin alone
  // stranded the test page with a link to a port that need not even be published.
  it('accepts the origin the operator is actually browsing, on the same host', () => {
    const client = localTestClient('http://idp.test:7100');

    expect(client.redirectUris).toContain('http://idp.test:7100/api/oidc/test/callback');
    expect(client.redirectUris).toContain('https://fake-idp.test/api/oidc/test/callback');
    expect(client.postLogoutRedirectUris).toContain('http://idp.test:7100/api/oidc/test');
  });

  // An operator's hosts file may point several names at the same stack; the
  // hostname is not something this client can predict, only the PATH is fixed.
  it('accepts any http(s) origin but only ever its own callback path', () => {
    for (const origin of ['http://dev.test:7100', 'http://idp.test:7101', 'https://somewhere.example:8443']) {
      expect(isAcceptableBrowsingOrigin(origin)).toBe(true);
      expect(localTestClient(origin).redirectUris).toContain(`${origin}/api/oidc/test/callback`);
    }

    // Every generated URI stays on this app's own test-callback path.
    for (const uri of localTestClient('http://dev.test:7100').redirectUris) {
      expect(uri.endsWith('/api/oidc/test/callback')).toBe(true);
    }
  });

  it('rejects an origin that is not a usable http(s) URL', () => {
    expect(isAcceptableBrowsingOrigin(undefined)).toBe(false);
    expect(isAcceptableBrowsingOrigin('')).toBe(false);
    expect(isAcceptableBrowsingOrigin('not a url')).toBe(false);
    expect(isAcceptableBrowsingOrigin('javascript:alert(1)')).toBe(false);
    expect(localTestClient('not a url').redirectUris).toEqual(['https://fake-idp.test/api/oidc/test/callback']);
  });

  it('cannot be shadowed by a database row with the same client_id', async () => {
    const impostor: OidcClientStore = {
      getClient: vi.fn(async () => ({
        clientId: LOCAL_TEST_CLIENT_ID,
        clientSecret: '',
        name: 'Impostor',
        redirectUris: ['https://attacker.test/steal'],
        postLogoutRedirectUris: [],
        requirePkce: false,
        isPublic: true,
      })),
    };

    const client = await new LocalFirstClientStore(impostor).getClient(LOCAL_TEST_CLIENT_ID);
    expect(client?.name).toBe('Lokal testapplikation');
    expect(impostor.getClient).not.toHaveBeenCalled();
  });

  it('delegates every other client_id to the database', async () => {
    await new LocalFirstClientStore(emptyStore).getClient('something-else');
    expect(emptyStore.getClient).toHaveBeenCalledWith('something-else');
  });
});

// The vitest environment has no PUBLIC_PREFIX, so the sub-path deployment that
// broke in practice cannot be reached through the app here. testRpUrls is pure, so
// the invariant is asserted against it directly.
describe('URL construction under a public sub-path', () => {
  it('keeps the public prefix that the proxy strips before the request arrives', () => {
    // What the backend sees behind nginx is /api/oidc/test; what the BROWSER must
    // be sent is /idp2/api/oidc/test, or the redirect 404s back at the proxy.
    const urls = testRpUrls('http://idp.test:7101', '/idp2/api/oidc', '/idp2/api/oidc/test');

    expect(urls.loginUrl).toBe('/idp2/api/oidc/test/login');
    expect(urls.logoutUrl).toBe('/idp2/api/oidc/test/logout');
    expect(urls.resultUrl).toBe('/idp2/api/oidc/test');
    expect(urls.oidcBase).toBe('/idp2/api/oidc');
    expect(urls.callbackUrl).toBe('http://idp.test:7101/idp2/api/oidc/test/callback');
    expect(urls.postLogoutUrl).toBe('http://idp.test:7101/idp2/api/oidc/test');
  });

  it('emits same-origin relative paths for everything the browser navigates to', () => {
    const urls = testRpUrls('http://dev.test:7100', '/api/oidc', '/api/oidc/test');

    // Relative, so a click never leaves the origin the operator is browsing.
    for (const url of [urls.loginUrl, urls.logoutUrl, urls.resultUrl, urls.oidcBase]) {
      expect(url.startsWith('/')).toBe(true);
    }
    // Absolute only where OIDC requires it, and on the browsing origin.
    expect(urls.callbackUrl).toBe('http://dev.test:7100/api/oidc/test/callback');
  });
});

describe('local OIDC test page', () => {
  it('offers the flow and the discovery URL before anyone has logged in', async () => {
    const response = await client().get('/api/oidc/test').expect(200);

    expect(response.text).toContain('Testa OIDC-inloggning');
    expect(response.text).toContain('https://fake-idp.test/api/oidc/.well-known/openid-configuration');
  });

  it('completes a real code exchange and shows the verified claims', async () => {
    const agent = browser();
    const { callbackLocation } = await runTestFlow(agent);

    // No failMessage: the code was exchanged at /token over HTTP and the ID token
    // verified against the key published in /jwks.json. Relative, so the operator
    // stays on the origin they opened the page on.
    expect(callbackLocation).toBe('/api/oidc/test');

    const result = await agent.get('/api/oidc/test').expect(200);
    expect(result.text).toContain('OIDC-inloggningen lyckades');
    expect(result.text).toContain('Test Person');
    expect(result.text).toContain('test.person');
    expect(result.text).toContain('developers');
    expect(result.text).toContain('196001011234');
    // Both halves are shown: the ID token and what /userinfo returned.
    expect(result.text).toContain('ID-token');
    expect(result.text).toContain('Claims från /userinfo');
  });

  it('keeps the operator on the origin they opened the page on', async () => {
    const agent = browser();
    const start = await agent.get('/api/oidc/test/login').expect(303);

    // The regression: this used to be an absolute URL on the issuer origin, which
    // is a port that need not be published at all.
    expect(start.headers.location.startsWith('/api/oidc/authorize?')).toBe(true);
    const redirectUri = new URL(start.headers.location, baseUrl).searchParams.get('redirect_uri');
    expect(redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/oidc\/test\/callback$/);
  });

  it('reports a mismatched state instead of accepting the response', async () => {
    const agent = browser();
    await agent.get('/api/oidc/test/login').expect(303);

    const response = await agent.get('/api/oidc/test/callback').query({ code: 'whatever', state: 'not-mine' }).expect(303);
    expect(response.headers.location).toContain('failMessage=OIDC_STATE_MISMATCH');

    const page = await agent.get('/api/oidc/test?failMessage=OIDC_STATE_MISMATCH').expect(200);
    expect(page.text).toContain('OIDC-inloggningen misslyckades');
    expect(page.text).toContain('OIDC_STATE_MISMATCH');
  });

  it('surfaces an error the authorization endpoint sent back', async () => {
    const agent = browser();
    const start = await agent.get('/api/oidc/test/login').expect(303);
    const state = new URL(start.headers.location, baseUrl).searchParams.get('state');

    const response = await agent.get('/api/oidc/test/callback').query({ error: 'access_denied', error_description: 'nope', state }).expect(303);

    expect(response.headers.location).toContain('failMessage=OIDC_AUTHORIZE_ERROR');
  });

  it('logs out through the provider rather than only clearing its own result', async () => {
    const agent = browser();
    await runTestFlow(agent);

    const logout = await agent.get('/api/oidc/test/logout').expect(303);
    const endSession = new URL(logout.headers.location, baseUrl);
    expect(endSession.pathname).toBe('/api/oidc/end-session');
    expect(endSession.searchParams.get('client_id')).toBe(LOCAL_TEST_CLIENT_ID);

    const backAtTest = await agent.get(asPath(logout.headers.location)).expect(303);
    // Absolute, because post_logout_redirect_uri must be — but on the origin the
    // browser used, not the issuer's.
    expect(backAtTest.headers.location).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/oidc\/test$/);

    // The shared test identity is gone, so the SAML side is logged out too.
    const idpPage = await agent.get('/api/saml/idp/login').expect(200);
    expect(idpPage.text).toContain('Välj testidentitet');

    const testPage = await agent.get('/api/oidc/test').expect(200);
    expect(testPage.text).toContain('Testa OIDC-inloggning');
  });
});
