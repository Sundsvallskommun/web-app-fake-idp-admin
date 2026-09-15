import { csrfProtection } from '@middlewares/csrf.middleware';
import { createHash, randomBytes } from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { registerIdpRoutes } from '../saml-idp/idp.routes';
import type { UserWithAttributes } from '../saml-idp/response-builder';
import type { OidcClientRecord, OidcClientStore } from './client-store';
import { base64url } from './keys';
import { registerOidcRoutes } from './oidc.routes';

// No @config mock: vitest.setup.ts supplies a real keypair and entity ID, so the
// paths, the issuer and the signatures under test are the ones production derives.

const REDIRECT_URI = 'https://rp.test/callback';
const CLIENT_SECRET = 'test-client-secret';

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

const confidentialClient: OidcClientRecord = {
  clientId: 'test-client',
  clientSecret: CLIENT_SECRET,
  name: 'Testapplikationen',
  redirectUris: [REDIRECT_URI],
  postLogoutRedirectUris: ['https://rp.test/bye'],
  requirePkce: true,
  isPublic: false,
};

const publicClient: OidcClientRecord = {
  clientId: 'public-client',
  clientSecret: '',
  name: 'SPA:n',
  redirectUris: ['https://spa.test/callback'],
  postLogoutRedirectUris: [],
  requirePkce: true,
  isPublic: true,
};

const usersService = {
  getUser: vi.fn(async (id: string) => (id === identity.id ? identity : null)),
  getUsers: vi.fn(async () => [identity]),
  getUsersByUsername: vi.fn(async (username: string) => (username === identity.username ? [identity] : [])),
};

const clientStore: OidcClientStore = {
  getClient: vi.fn(async (clientId: string) => [confidentialClient, publicClient].find(client => client.clientId === clientId) ?? null),
};

const createApp = () => {
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
  // The production CSRF guard, so the allowlist for /token and /userinfo is exercised.
  app.use(csrfProtection);
  registerIdpRoutes(app, usersService);
  registerOidcRoutes(app, usersService, clientStore);
  // Express requires arity 4 for an error handler — _next must stay unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.status ?? 500).send(error.message);
  });
  return app;
};

const csrfTokenFrom = (html: string): string => {
  const token = html.match(/name="_csrf" value="([^"]+)"/)?.[1];
  if (!token) {
    throw new Error('Missing CSRF token in IdP page');
  }
  return token;
};

const pkce = () => {
  const verifier = base64url(randomBytes(32));
  return { verifier, challenge: base64url(createHash('sha256').update(verifier, 'ascii').digest()) };
};

const authorizeQuery = (overrides: Record<string, string> = {}) => ({
  response_type: 'code',
  client_id: confidentialClient.clientId,
  redirect_uri: REDIRECT_URI,
  scope: 'openid profile email',
  state: 'state-123',
  nonce: 'nonce-123',
  ...overrides,
});

const codeFrom = (location: string): string => {
  const code = new URL(location).searchParams.get('code');
  if (!code) {
    throw new Error(`No code in ${location}`);
  }
  return code;
};

/** Drive the browser half of the flow: authorize -> pick an identity -> back to the RP. */
const authorizeAndLogin = async (agent: ReturnType<typeof request.agent>, query: Record<string, string>) => {
  // The shared picker lives on the protocol-neutral path, so an OIDC login never
  // appears to detour into /api/saml/*.
  await agent.get('/api/oidc/authorize').query(query).expect(303).expect('Location', '/api/idp/login');

  const page = await agent.get('/api/idp/login').expect(200);
  const response = await agent
    .post('/api/idp/authenticate')
    .type('form')
    .send({ userid: identity.id, _csrf: csrfTokenFrom(page.text) })
    .expect(303);

  return response.headers.location as string;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OIDC metadata', () => {
  // Discovery answers only on the issuer's own host (see oidc.routes.ts) — supertest
  // requests otherwise arrive as 127.0.0.1:<ephemeral port>.
  const ISSUER_HOST = 'fake-idp.test';

  it('publishes discovery below the issuer, with only the flows it implements', async () => {
    const response = await request(createApp()).get('/api/oidc/.well-known/openid-configuration').set('Host', ISSUER_HOST).expect(200);

    expect(response.body).toMatchObject({
      issuer: 'https://fake-idp.test/api/oidc',
      authorization_endpoint: 'https://fake-idp.test/api/oidc/authorize',
      token_endpoint: 'https://fake-idp.test/api/oidc/token',
      userinfo_endpoint: 'https://fake-idp.test/api/oidc/userinfo',
      jwks_uri: 'https://fake-idp.test/api/oidc/jwks.json',
      introspection_endpoint: 'https://fake-idp.test/api/oidc/introspect',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      id_token_signing_alg_values_supported: ['RS256'],
    });
    expect(response.body.code_challenge_methods_supported).toContain('S256');
  });

  it('serves a JWKS an RP can verify signatures against', async () => {
    const response = await request(createApp()).get('/api/oidc/jwks.json').expect(200);

    expect(response.body.keys).toHaveLength(1);
    expect(response.body.keys[0]).toMatchObject({ kty: 'RSA', use: 'sig', alg: 'RS256' });
    expect(response.body.keys[0].kid).toEqual(expect.any(String));
  });

  it('lets a browser-based RP read discovery cross-origin', async () => {
    await request(createApp())
      .get('/api/oidc/.well-known/openid-configuration')
      .set('Host', ISSUER_HOST)
      .expect('Access-Control-Allow-Origin', '*')
      .expect(200);
  });

  it('refuses discovery on a non-issuer host, pointing at the canonical URL', async () => {
    // Both the proxy and the backend's direct port answer, but the document pins
    // the issuer — an RP that validates issuer-vs-discovery-URL (RFC 8414) would
    // hard-fail with a confusing mismatch. A 404 with a pointer fails clearly.
    const response = await request(createApp()).get('/api/oidc/.well-known/openid-configuration').expect(404);

    expect(response.body.error_description).toContain('https://fake-idp.test/api/oidc/.well-known/openid-configuration');
  });

  it('keeps every other endpoint origin-agnostic — only discovery is host-bound', async () => {
    await request(createApp()).get('/api/oidc/jwks.json').expect(200);
  });

  it('answers the preflight a client_secret_basic exchange triggers', async () => {
    // The POST route alone would never see OPTIONS, so this covers the router-level
    // CORS middleware rather than the token handler.
    await request(createApp())
      .options('/api/oidc/token')
      .expect(204)
      .expect('Access-Control-Allow-Origin', '*')
      .expect('Access-Control-Allow-Headers', /Authorization/);
  });
});

describe('authorization code flow', () => {
  it('runs authorize -> login -> token -> userinfo end to end', async () => {
    const app = createApp();
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();

    const location = await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));
    expect(location.startsWith(`${REDIRECT_URI}?`)).toBe(true);
    // `state` must come back untouched — it is the RP's own CSRF defence.
    expect(new URL(location).searchParams.get('state')).toBe('state-123');

    const token = await request(app)
      .post('/api/oidc/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: codeFrom(location),
        redirect_uri: REDIRECT_URI,
        client_id: confidentialClient.clientId,
        client_secret: CLIENT_SECRET,
        code_verifier: verifier,
      })
      .expect(200);

    expect(token.body).toMatchObject({ token_type: 'Bearer', scope: 'openid profile email' });
    expect(token.headers['cache-control']).toContain('no-store');

    const idToken = jwt.decode(token.body.id_token) as jwt.JwtPayload;
    expect(idToken).toMatchObject({
      iss: 'https://fake-idp.test/api/oidc',
      sub: identity.id,
      aud: confidentialClient.clientId,
      nonce: 'nonce-123',
      name: 'Test Person',
      given_name: 'Test',
      groups: ['developers'],
      citizenIdentifier: '196001011234',
    });
    expect(idToken.at_hash).toEqual(expect.any(String));

    const userinfo = await request(app).get('/api/oidc/userinfo').set('Authorization', `Bearer ${token.body.access_token}`).expect(200);
    expect(userinfo.body).toMatchObject({ sub: identity.id, preferred_username: 'test.person', groups: ['developers'] });
  });

  it('accepts client_secret_basic as well as client_secret_post', async () => {
    const app = createApp();
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();
    const location = await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));

    await request(app)
      .post('/api/oidc/token')
      .auth(confidentialClient.clientId, CLIENT_SECRET)
      .type('form')
      .send({ grant_type: 'authorization_code', code: codeFrom(location), redirect_uri: REDIRECT_URI, code_verifier: verifier })
      .expect(200);
  });

  it('reuses the selected identity for the next client without a second prompt', async () => {
    const agent = request.agent(createApp());
    const first = pkce();
    await authorizeAndLogin(agent, authorizeQuery({ code_challenge: first.challenge, code_challenge_method: 'S256' }));

    // SSO: straight back to the RP, no trip through the login page.
    const second = pkce();
    const response = await agent
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ code_challenge: second.challenge, code_challenge_method: 'S256', state: 'state-456' }))
      .expect(303);

    expect(response.headers.location.startsWith(`${REDIRECT_URI}?`)).toBe(true);
    expect(new URL(response.headers.location).searchParams.get('state')).toBe('state-456');
  });

  it('re-prompts when the RP asks for prompt=login', async () => {
    const agent = request.agent(createApp());
    const { challenge } = pkce();
    await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));

    await agent
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256', prompt: 'login' }))
      .expect(303)
      .expect('Location', '/api/idp/login');
  });

  it('authenticates a public client with PKCE and no secret', async () => {
    const app = createApp();
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();
    const location = await authorizeAndLogin(
      agent,
      authorizeQuery({
        client_id: publicClient.clientId,
        redirect_uri: 'https://spa.test/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
    );

    await request(app)
      .post('/api/oidc/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: codeFrom(location),
        redirect_uri: 'https://spa.test/callback',
        client_id: publicClient.clientId,
        code_verifier: verifier,
      })
      .expect(200);
  });

  it('narrows the claims to the granted scopes', async () => {
    const app = createApp();
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();
    const location = await authorizeAndLogin(agent, authorizeQuery({ scope: 'openid', code_challenge: challenge, code_challenge_method: 'S256' }));

    const token = await request(app)
      .post('/api/oidc/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: codeFrom(location),
        redirect_uri: REDIRECT_URI,
        client_id: confidentialClient.clientId,
        client_secret: CLIENT_SECRET,
        code_verifier: verifier,
      })
      .expect(200);

    const idToken = jwt.decode(token.body.id_token) as jwt.JwtPayload;
    expect(idToken.sub).toBe(identity.id);
    expect(idToken.name).toBeUndefined();
    expect(idToken.given_name).toBeUndefined();
    // Mirrors the SAML assertion: groups and custom attributes are not scope-gated.
    expect(idToken.groups).toEqual(['developers']);
  });
});

describe('authorization endpoint validation', () => {
  it('refuses an unregistered redirect_uri on screen instead of redirecting to it', async () => {
    const response = await request(createApp())
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ redirect_uri: 'https://attacker.test/steal' }))
      .expect(400);

    expect(response.headers.location).toBeUndefined();
    expect(response.text).toContain('redirect_uri');
  });

  it('refuses an unknown client_id without redirecting', async () => {
    const response = await request(createApp())
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ client_id: 'nope' }))
      .expect(400);

    expect(response.headers.location).toBeUndefined();
  });

  it('redirects protocol errors back to the registered callback', async () => {
    const response = await request(createApp())
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ response_type: 'token' }))
      .expect(303);

    const location = new URL(response.headers.location);
    expect(location.origin + location.pathname).toBe(REDIRECT_URI);
    expect(location.searchParams.get('error')).toBe('unsupported_response_type');
    expect(location.searchParams.get('state')).toBe('state-123');
  });

  it('requires the openid scope', async () => {
    const response = await request(createApp())
      .get('/api/oidc/authorize')
      .query(authorizeQuery({ scope: 'profile' }))
      .expect(303);

    expect(new URL(response.headers.location).searchParams.get('error')).toBe('invalid_scope');
  });

  it('requires PKCE from a client registered to demand it', async () => {
    const response = await request(createApp()).get('/api/oidc/authorize').query(authorizeQuery()).expect(303);

    const location = new URL(response.headers.location);
    expect(location.searchParams.get('error')).toBe('invalid_request');
    expect(location.searchParams.get('error_description')).toContain('code_challenge');
  });
});

describe('token endpoint validation', () => {
  // Not async: callers chain supertest's own .expect() onto the returned Test.
  const exchange = (app: express.Application, body: Record<string, string>) => request(app).post('/api/oidc/token').type('form').send(body);

  /** Authorize and log in, returning a code plus the verifier that unlocks it. */
  const freshCode = async (app: express.Application) => {
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();
    const location = await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));
    return { code: codeFrom(location), verifier };
  };

  const validBody = (code: string, verifier: string) => ({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: confidentialClient.clientId,
    client_secret: CLIENT_SECRET,
    code_verifier: verifier,
  });

  it('reaches the handler without a CSRF token — the RP calls it server to server', async () => {
    const response = await exchange(createApp(), { grant_type: 'authorization_code' });

    // The point is that CSRF did not intercept it: the handler ran and produced a
    // protocol error about the missing client, not a 403 about a missing token.
    expect(response.status).not.toBe(403);
    expect(response.body.error).toBe('invalid_client');
  });

  it('rejects a wrong client secret', async () => {
    const app = createApp();
    const { code, verifier } = await freshCode(app);

    const response = await exchange(app, { ...validBody(code, verifier), client_secret: 'wrong' }).expect(401);
    expect(response.body.error).toBe('invalid_client');
  });

  it('rejects a code_verifier that does not match the challenge', async () => {
    const app = createApp();
    const { code } = await freshCode(app);

    const response = await exchange(app, validBody(code, pkce().verifier)).expect(400);
    expect(response.body.error).toBe('invalid_grant');
  });

  it('rejects a redirect_uri that differs from the authorization', async () => {
    const app = createApp();
    const { code, verifier } = await freshCode(app);

    const response = await exchange(app, { ...validBody(code, verifier), redirect_uri: 'https://rp.test/other' }).expect(400);
    expect(response.body.error).toBe('invalid_grant');
  });

  it('refuses to honour a code twice', async () => {
    const app = createApp();
    const { code, verifier } = await freshCode(app);

    await exchange(app, validBody(code, verifier)).expect(200);
    const replay = await exchange(app, validBody(code, verifier)).expect(400);
    expect(replay.body.error).toBe('invalid_grant');
  });

  it('rejects a code presented by a different client', async () => {
    const app = createApp();
    const { code, verifier } = await freshCode(app);

    const response = await exchange(app, {
      ...validBody(code, verifier),
      client_id: publicClient.clientId,
      client_secret: '',
    }).expect(400);
    expect(response.body.error).toBe('invalid_grant');
  });

  it('supports only the authorization_code grant', async () => {
    const response = await exchange(createApp(), { grant_type: 'client_credentials' }).expect(400);
    expect(response.body.error).toBe('unsupported_grant_type');
  });
});

describe('introspection', () => {
  /** Run the full flow and return the token response — the introspectable artefacts. */
  const obtainTokens = async (app: express.Application) => {
    const agent = request.agent(app);
    const { verifier, challenge } = pkce();
    const location = await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));

    const token = await request(app)
      .post('/api/oidc/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: codeFrom(location),
        redirect_uri: REDIRECT_URI,
        client_id: confidentialClient.clientId,
        client_secret: CLIENT_SECRET,
        code_verifier: verifier,
      })
      .expect(200);
    return token.body as { access_token: string; id_token: string };
  };

  it('reports a live access token active, with the RFC 7662 members', async () => {
    const app = createApp();
    const { access_token } = await obtainTokens(app);

    const response = await request(app)
      .post('/api/oidc/introspect')
      .auth(confidentialClient.clientId, CLIENT_SECRET)
      .type('form')
      .send({ token: access_token })
      .expect(200);

    expect(response.body).toMatchObject({
      active: true,
      sub: identity.id,
      scope: 'openid profile email',
      client_id: confidentialClient.clientId,
      token_type: 'Bearer',
      iss: 'https://fake-idp.test/api/oidc',
    });
    expect(response.body.exp).toEqual(expect.any(Number));
    expect(response.headers['cache-control']).toContain('no-store');
  });

  it('accepts client_secret_post as well, without a CSRF token', async () => {
    const app = createApp();
    const { access_token } = await obtainTokens(app);

    const response = await request(app)
      .post('/api/oidc/introspect')
      .type('form')
      .send({ token: access_token, client_id: confidentialClient.clientId, client_secret: CLIENT_SECRET })
      .expect(200);

    expect(response.body.active).toBe(true);
  });

  it('reports garbage as inactive rather than erroring — RFC 7662 §2.2', async () => {
    const response = await request(createApp())
      .post('/api/oidc/introspect')
      .auth(confidentialClient.clientId, CLIENT_SECRET)
      .type('form')
      .send({ token: 'nonsense' })
      .expect(200);

    expect(response.body).toEqual({ active: false });
  });

  it('reports an ID token as inactive — only access tokens are introspectable', async () => {
    const app = createApp();
    const { id_token } = await obtainTokens(app);

    const response = await request(app)
      .post('/api/oidc/introspect')
      .auth(confidentialClient.clientId, CLIENT_SECRET)
      .type('form')
      .send({ token: id_token })
      .expect(200);

    expect(response.body).toEqual({ active: false });
  });

  it('requires client authentication, so tokens cannot be scanned anonymously', async () => {
    const app = createApp();
    const { access_token } = await obtainTokens(app);

    await request(app).post('/api/oidc/introspect').type('form').send({ token: access_token }).expect(401);
    await request(app).post('/api/oidc/introspect').auth(confidentialClient.clientId, 'wrong').type('form').send({ token: access_token }).expect(401);
  });
});

describe('userinfo', () => {
  it('rejects a missing or invalid bearer token', async () => {
    const app = createApp();

    await request(app).get('/api/oidc/userinfo').expect(401).expect('WWW-Authenticate', 'Bearer');
    await request(app).get('/api/oidc/userinfo').set('Authorization', 'Bearer nonsense').expect(401);
  });

  it('accepts POST without a CSRF token, as the spec requires it to', async () => {
    const response = await request(createApp()).post('/api/oidc/userinfo').type('form').send({ access_token: 'nonsense' });

    expect(response.status).toBe(401);
  });
});

describe('RP-initiated logout', () => {
  it('ends the shared test session and returns to a registered post-logout URI', async () => {
    const agent = request.agent(createApp());
    const { challenge } = pkce();
    await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));

    await agent
      .get('/api/oidc/end-session')
      .query({ client_id: confidentialClient.clientId, post_logout_redirect_uri: 'https://rp.test/bye', state: 'bye-1' })
      .expect(303)
      .expect('Location', 'https://rp.test/bye?state=bye-1');

    // One session, one identity: the SAML side is logged out too.
    const page = await agent.get('/api/saml/idp/login').expect(200);
    expect(page.text).toContain('Välj testidentitet');
  });

  it('ignores an unregistered post-logout URI rather than becoming an open redirect', async () => {
    const agent = request.agent(createApp());
    const { challenge } = pkce();
    await authorizeAndLogin(agent, authorizeQuery({ code_challenge: challenge, code_challenge_method: 'S256' }));

    await agent
      .get('/api/oidc/end-session')
      .query({ client_id: confidentialClient.clientId, post_logout_redirect_uri: 'https://attacker.test/steal' })
      .expect(303)
      .expect('Location', '/api/idp/login?loggedout=1');
  });
});
