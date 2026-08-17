import { renderIdentitySession, renderLogin, renderSamlTest } from './templates';

const users = [{ id: 'user-1', name: 'Test Person', username: 'test.person' }];
const navigation = { idpUrl: '/api/saml/idp/login', adminUrl: '/start' };
const csrfToken = 'csrf-token';

describe('Fake IdP pages', () => {
  it('shows the target service and test identities for an active SAML request', () => {
    const html = renderLogin({
      action: '/api/saml/idp/authenticate',
      csrfToken,
      navigation,
      target: { name: 'app.example.test', url: 'https://app.example.test/saml/callback' },
      users,
      enumerateUsers: true,
    });

    expect(html).toContain('SAML-testinloggning');
    expect(html).toContain('Välj testidentitet');
    expect(html).toContain('app.example.test');
    expect(html).toContain('Test Person');
    expect(html).toContain('test.person');
    expect(html).toContain('Logga in och fortsätt');
    expect(html).toContain('Administration');
  });

  it('renders the application filter and badges when identities have applications', () => {
    const html = renderLogin({
      action: '/api/saml/idp/authenticate',
      csrfToken,
      navigation,
      users: [
        { id: 'user-1', name: 'Test Person', username: 'test.person', applications: ['draken', 'katla'] },
        { id: 'user-2', name: 'Other Person', username: 'other.person' },
      ],
      enumerateUsers: true,
    });

    expect(html).toContain('id="appFilter"');
    expect(html).toContain('Alla applikationer');
    expect(html).toContain('<option value="draken">draken</option>');
    expect(html).toContain('data-apps="draken|katla"');
    expect(html).toContain('id="identitySearch"');
    expect(html).toContain('class="badge"');
  });

  it('omits the application filter when no identity has applications', () => {
    const html = renderLogin({
      action: '/api/saml/idp/authenticate',
      csrfToken,
      navigation,
      users,
      enumerateUsers: true,
    });

    expect(html).toContain('id="identitySearch"');
    expect(html).not.toContain('id="appFilter"');
  });

  it('allows selecting a test identity without an active SAML request', () => {
    const html = renderLogin({
      action: '/api/saml/idp/authenticate',
      csrfToken,
      navigation,
      users,
      enumerateUsers: true,
    });

    expect(html).toContain('Testsession');
    expect(html).toContain('Logga in som testidentitet');
    expect(html).not.toContain('Fortsätt till');
  });

  it('shows the active identity and separate logout action', () => {
    const html = renderIdentitySession({
      identity: users[0],
      csrfToken,
      navigation,
      logoutAction: '/api/saml/idp/logout',
      samlLoginUrl: '/api/saml/login',
    });

    expect(html).toContain('Aktiv testsession');
    expect(html).toContain('Inloggad som Test Person');
    expect(html).toContain('Logga ut testidentitet');
    expect(html).toContain('Starta lokalt SAML-test');
  });

  it('shows the identity received by the local SAML test application', () => {
    const html = renderSamlTest({
      identity: users[0],
      navigation,
      samlLoginUrl: '/api/saml/login',
    });

    expect(html).toContain('SAML-inloggningen lyckades');
    expect(html).toContain('Mottagen identitet');
    expect(html).toContain('Test Person');
    expect(html).toContain('Hantera testsession');
  });

  it('disables identity selection when the database is empty', () => {
    const html = renderLogin({
      action: '/authenticate',
      csrfToken,
      navigation,
      target: { name: 'app.example.test', url: 'https://app.example.test/callback' },
      users: [],
      enumerateUsers: true,
    });

    expect(html).toContain('Det finns inga testidentiteter');
    expect(html).toContain('type="submit" disabled');
  });

  it('escapes identity, target and navigation data rendered in the page', () => {
    const html = renderLogin({
      action: '/authenticate',
      csrfToken,
      navigation: { idpUrl: '/login?a=1&b=2', adminUrl: 'https://admin.test/?q=<unsafe>' },
      target: { name: '<script>alert(1)</script>', url: 'https://example.test/?a=1&b=2' },
      users: [{ id: 'id"', name: '<b>Person</b>', username: 'test&person' }],
      enumerateUsers: true,
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;Person&lt;/b&gt;');
    expect(html).toContain('test&amp;person');
    expect(html).toContain('q=&lt;unsafe&gt;');
    expect(html).toContain('name="_csrf" value="csrf-token"');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
