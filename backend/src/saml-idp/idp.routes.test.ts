import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import request from 'supertest';
import { csrfProtection } from '@middlewares/csrf.middleware';
import type { UserWithAttributes } from './response-builder';
import { IdpUserStore, registerIdpRoutes } from './idp.routes';
import { createResponse } from './response-builder';

vi.mock('@config', () => ({
  ADMIN_URL: '/start',
  // Krävs av @utils/util som idp.routes importerar isValidUrl från.
  BASE_URL_PREFIX: '/api',
  IDP_MOUNT_PATH: '/api/saml/idp',
  IDP_PATH_PREFIX: '',
  IDP_PUBLIC_PATH: '/api/saml/idp',
  SAML_IDP_ENTITY_ID: 'https://fake-idp.test/api/saml/idp/metadata',
  SAML_IDP_ENUMERATE_USERS: true,
}));

vi.mock('@utils/logger', () => ({
  logger: { info: vi.fn() },
}));

vi.mock('./request-parser', () => ({
  parseRequest: vi.fn(async () => ({
    destination: 'https://service-provider.test/saml/callback',
    inResponseTo: '_request-1',
    relayState: 'return-here',
  })),
}));

vi.mock('./response-builder', () => ({
  createResponse: vi.fn(() => ({
    action: 'https://service-provider.test/saml/callback',
    samlResponse: 'signed-response',
    relayState: 'return-here',
  })),
}));

const identity: UserWithAttributes = {
  id: 'user-1',
  name: 'Test Person',
  username: 'test.person',
  password: 'test-password',
  requirePassword: false,
  attributes: [],
  groups: [],
};

const protectedIdentity: UserWithAttributes = {
  ...identity,
  id: 'protected-user',
  name: 'Protected Person',
  username: 'protected.person',
  password: 'protected-password',
  requirePassword: true,
};

const usersService: IdpUserStore = {
  getUser: vi.fn(async id => [identity, protectedIdentity].find(user => user.id === id) ?? null),
  getUsers: vi.fn(async () => [identity, protectedIdentity]),
  getUsersByUsername: vi.fn(async username => [identity, protectedIdentity].filter(user => user.username === username)),
};

const createApp = () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto' },
    }),
  );
  // Samma csrf-sync-skydd som produktionsappen (CodeQL känner inte igen
  // biblioteket och kan flagga testharnessens cookie-parser — falsk positiv).
  app.use(csrfProtection);
  registerIdpRoutes(app, usersService);
  // Express kräver arity 4 för felhanterare — _next måste stå kvar oanvänd.
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

describe('Fake IdP test identity session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identity.requirePassword = false;
  });

  it('keeps the selected identity across SAML requests until explicit logout', async () => {
    const agent = request.agent(createApp());

    const initialPage = await agent.get('/api/saml/idp/login').expect(200);
    expect(initialPage.text).toContain('Välj testidentitet');
    const initialCsrfToken = csrfTokenFrom(initialPage.text);

    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: identity.id, _csrf: initialCsrfToken })
      .expect(303)
      .expect('Location', '/api/saml/idp/login');

    const activePage = await agent.get('/api/saml/idp/login').expect(200);
    expect(activePage.text).toContain('Inloggad som Test Person');
    const activeCsrfToken = csrfTokenFrom(activePage.text);

    const samlResponse = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    expect(samlResponse.text).toContain('value="signed-response"');
    expect(samlResponse.text).not.toContain('Välj testidentitet');
    expect(createResponse).toHaveBeenCalledWith(expect.objectContaining({ inResponseTo: '_request-1' }), identity);

    const stillActivePage = await agent.get('/api/saml/idp/login').expect(200);
    expect(stillActivePage.text).toContain('Inloggad som Test Person');

    await agent
      .post('/api/saml/idp/logout')
      .type('form')
      .send({ _csrf: activeCsrfToken })
      .expect(303)
      .expect('Location', '/api/saml/idp/login?loggedout=1');

    const loggedOutPage = await agent.get('/api/saml/idp/login?loggedout=1').expect(200);
    expect(loggedOutPage.text).toContain('Testidentiteten är utloggad');
    expect(loggedOutPage.text).toContain('Välj testidentitet');

    const nextSamlRequest = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    expect(nextSamlRequest.text).toContain('Välj testidentitet');
    expect(nextSamlRequest.text).toContain('service-provider.test');
  });

  it.each([undefined, '', 'wrong-password', identity.password])(
    'rejects a protected identity with password %s and keeps the selection',
    async password => {
      const agent = request.agent(createApp());
      const page = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
      const response = await agent
        .post('/api/saml/idp/authenticate')
        .type('form')
        .send({ userid: protectedIdentity.id, password, _csrf: csrfTokenFrom(page.text) })
        .expect(401);

      expect(response.text).toContain('value="protected-user" data-require-password="true" checked');
      expect(response.text).toContain('id="identityPassword">');
      expect(response.text).not.toContain(protectedIdentity.password);
      expect(createResponse).not.toHaveBeenCalled();
      expect((await agent.get('/api/saml/idp/login')).text).not.toContain('Inloggad som');
    },
  );

  it('verifies the selected identity once and reuses its authenticated SAML session', async () => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: protectedIdentity.id, password: protectedIdentity.password, _csrf: csrfTokenFrom(page.text) })
      .expect(200);
    expect(createResponse).toHaveBeenLastCalledWith(expect.anything(), protectedIdentity);
    const next = await agent.get('/api/saml/idp/sso?SAMLRequest=next').expect(200);
    expect(next.text).toContain('value="signed-response"');
    expect((await agent.get('/api/saml/idp/login')).text).toContain('Inloggad som Protected Person');
  });

  it('requires verification when a password requirement is enabled for an active password-free identity', async () => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login').expect(200);
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: identity.id, _csrf: csrfTokenFrom(page.text) })
      .expect(303);
    identity.requirePassword = true;

    const response = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    expect(response.text).toContain('Välj testidentitet');
    expect(createResponse).not.toHaveBeenCalled();
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: identity.id, password: identity.password, _csrf: csrfTokenFrom(response.text) })
      .expect(200);
    expect(createResponse).toHaveBeenLastCalledWith(expect.anything(), identity);
  });

  it('does not carry password verification over to another selected identity', async () => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login');
    const token = csrfTokenFrom(page.text);
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: protectedIdentity.id, password: protectedIdentity.password, _csrf: token })
      .expect(303);
    await agent.post('/api/saml/idp/authenticate').type('form').send({ userid: identity.id, _csrf: token }).expect(303);
    identity.requirePassword = true;
    expect((await agent.get('/api/saml/idp/sso?SAMLRequest=request')).text).toContain('Välj testidentitet');
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('requires the password again after logout', async () => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login');
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: protectedIdentity.id, password: protectedIdentity.password, _csrf: csrfTokenFrom(page.text) })
      .expect(303);
    await agent.get('/api/saml/idp/logout').expect(303);
    const loggedOut = await agent.get('/api/saml/idp/login');
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ userid: protectedIdentity.id, _csrf: csrfTokenFrom(loggedOut.text) })
      .expect(401);
  });

  it('allows manual username login without a password for an unprotected identity', async () => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login');
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ username: identity.username, _csrf: csrfTokenFrom(page.text) })
      .expect(303);
    expect((await agent.get('/api/saml/idp/login')).text).toContain('Inloggad som Test Person');
  });

  it.each([undefined, 'shared-password'])('rejects ambiguous usernames instead of choosing a person with password %s', async password => {
    vi.mocked(usersService.getUsersByUsername).mockResolvedValueOnce([
      { ...identity, password: 'shared-password' },
      { ...protectedIdentity, username: identity.username, password: 'shared-password' },
    ]);
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login');
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ username: identity.username, password, _csrf: csrfTokenFrom(page.text) })
      .expect(401);
  });

  it.each([
    ['wrong', 401],
    [protectedIdentity.password, 303],
  ])('checks the password in the manual username login too', async (password, status) => {
    const agent = request.agent(createApp());
    const page = await agent.get('/api/saml/idp/login');
    await agent
      .post('/api/saml/idp/authenticate')
      .type('form')
      .send({ username: protectedIdentity.username, password, _csrf: csrfTokenFrom(page.text) })
      .expect(status);
  });

  it('rejects an IdP identity change without a CSRF token', async () => {
    const agent = request.agent(createApp());
    await agent.get('/api/saml/idp/login').expect(200);

    await agent.post('/api/saml/idp/authenticate').type('form').send({ userid: identity.id }).expect(403);
  });

  it('accepts the external SAML POST binding without an application CSRF token', async () => {
    const response = await request(createApp()).post('/api/saml/idp/sso').type('form').send({ SAMLRequest: 'request' }).expect(200);

    expect(response.text).toContain('Välj testidentitet');
    expect(response.text).toContain('service-provider.test');
  });

  describe('GET /logout (external Service Providers)', () => {
    // Externa SP:er kan inte hålla en synchronizer-token — GET måste därför fungera
    // utan CSRF och kunna skicka webbläsaren tillbaka via RelayState.
    const selectIdentity = async (agent: ReturnType<typeof request.agent>) => {
      const page = await agent.get('/api/saml/idp/login').expect(200);
      await agent
        .post('/api/saml/idp/authenticate')
        .type('form')
        .send({ userid: identity.id, _csrf: csrfTokenFrom(page.text) })
        .expect(303);
    };

    it('clears the selected identity without a CSRF token', async () => {
      const agent = request.agent(createApp());
      await selectIdentity(agent);
      expect((await agent.get('/api/saml/idp/login').expect(200)).text).toContain('Inloggad som Test Person');

      await agent.get('/api/saml/idp/logout').expect(303).expect('Location', '/api/saml/idp/login?loggedout=1');

      const nextSamlRequest = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
      expect(nextSamlRequest.text).toContain('Välj testidentitet');
      expect(nextSamlRequest.text).not.toContain('value="signed-response"');
    });

    it('redirects back to an absolute RelayState', async () => {
      const agent = request.agent(createApp());
      await selectIdentity(agent);

      await agent
        .get('/api/saml/idp/logout')
        .query({ RelayState: 'https://service-provider.test/bye' })
        .expect(303)
        .expect('Location', 'https://service-provider.test/bye');
    });

    it('falls back to the IdP login page for a non-absolute RelayState', async () => {
      const agent = request.agent(createApp());
      await selectIdentity(agent);

      await agent
        .get('/api/saml/idp/logout')
        .query({ RelayState: '/not-absolute' })
        .expect(303)
        .expect('Location', '/api/saml/idp/login?loggedout=1');
    });
  });
});
