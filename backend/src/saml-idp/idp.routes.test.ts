import express from 'express';
import session from 'express-session';
import request from 'supertest';
import type { UserWithAttributes } from './response-builder';
import { IdpUserStore, registerIdpRoutes } from './idp.routes';
import { createResponse } from './response-builder';

jest.mock('@config', () => ({
  ADMIN_URL: '/start',
  BASE_URL_PREFIX: '/api',
  IDP_MOUNT_PATH: '/api/saml/idp',
  IDP_PATH_PREFIX: '',
  IDP_PUBLIC_PATH: '/api/saml/idp',
  SAML_IDP_ENTITY_ID: 'https://fake-idp.test/api/saml/idp/metadata',
  SAML_IDP_ENUMERATE_USERS: true,
}));

jest.mock('@utils/logger', () => ({
  logger: { info: jest.fn() },
}));

jest.mock('./request-parser', () => ({
  parseRequest: jest.fn(async () => ({
    destination: 'https://service-provider.test/saml/callback',
    inResponseTo: '_request-1',
    relayState: 'return-here',
  })),
}));

jest.mock('./response-builder', () => ({
  createResponse: jest.fn(() => ({
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
  attributes: [],
};

const usersService: IdpUserStore = {
  getUser: jest.fn(async id => (id === identity.id ? identity : null)),
  getUsers: jest.fn(async () => [identity]),
  getUsersByUsername: jest.fn(async username => (username === identity.username ? [identity] : [])),
};

const createApp = () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );
  registerIdpRoutes(app, usersService);
  return app;
};

describe('Fake IdP test identity session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the selected identity across SAML requests until explicit logout', async () => {
    const agent = request.agent(createApp());

    const initialPage = await agent.get('/api/saml/idp/login').expect(200);
    expect(initialPage.text).toContain('Välj testidentitet');

    await agent.post('/api/saml/idp/authenticate').type('form').send({ userid: identity.id }).expect(303).expect('Location', '/api/saml/idp/login');

    const activePage = await agent.get('/api/saml/idp/login').expect(200);
    expect(activePage.text).toContain('Inloggad som Test Person');

    const samlResponse = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    expect(samlResponse.text).toContain('value="signed-response"');
    expect(samlResponse.text).not.toContain('Välj testidentitet');
    expect(createResponse).toHaveBeenCalledWith(expect.objectContaining({ inResponseTo: '_request-1' }), identity);

    const stillActivePage = await agent.get('/api/saml/idp/login').expect(200);
    expect(stillActivePage.text).toContain('Inloggad som Test Person');

    await agent.post('/api/saml/idp/logout').expect(303).expect('Location', '/api/saml/idp/login?loggedout=1');

    const loggedOutPage = await agent.get('/api/saml/idp/login?loggedout=1').expect(200);
    expect(loggedOutPage.text).toContain('Testidentiteten är utloggad');
    expect(loggedOutPage.text).toContain('Välj testidentitet');

    const nextSamlRequest = await agent.get('/api/saml/idp/sso?SAMLRequest=request').expect(200);
    expect(nextSamlRequest.text).toContain('Välj testidentitet');
    expect(nextSamlRequest.text).toContain('service-provider.test');
  });
});
