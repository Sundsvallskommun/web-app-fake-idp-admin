import { renderIdentitySession, renderLogin, renderSamlTest } from './templates';

const users = [{ id: 'user-1', name: 'Test Person', username: 'test.person', requirePassword: false }];
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
        { id: 'user-1', name: 'Test Person', username: 'test.person', requirePassword: false, applications: ['draken', 'katla'] },
        { id: 'user-2', name: 'Other Person', username: 'other.person', requirePassword: false },
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

  it('shows the active identity and logout action without a local self-test shortcut', () => {
    const html = renderIdentitySession({
      identity: users[0],
      csrfToken,
      navigation,
      logoutAction: '/api/saml/idp/logout',
    });

    expect(html).toContain('Aktiv testsession');
    expect(html).toContain('Inloggad som Test Person');
    expect(html).toContain('Logga ut testidentitet');
    expect(html).not.toContain('Starta lokalt SAML-test');
  });

  it('lists the groups of the active identity, with their documentation', () => {
    const html = renderIdentitySession({
      identity: users[0],
      groups: [{ name: 'kundtjanst', description: 'Läsbehörighet i ärendeöversikten' }, { name: 'handlaggare' }],
      csrfToken,
      navigation,
      logoutAction: '/api/saml/idp/logout',
    });

    expect(html).toContain('Grupper och behörigheter');
    expect(html).toContain('kundtjanst');
    expect(html).toContain('Läsbehörighet i ärendeöversikten');
    expect(html).toContain('handlaggare');
  });

  it('says so when the active identity has no groups', () => {
    const html = renderIdentitySession({
      identity: users[0],
      groups: [],
      csrfToken,
      navigation,
      logoutAction: '/api/saml/idp/logout',
    });

    expect(html).toContain('Testidentiteten tillhör inga grupper.');
    expect(html).not.toContain('<details');
  });

  it('escapes group names and descriptions on the session page', () => {
    const html = renderIdentitySession({
      identity: users[0],
      groups: [{ name: '<b>grupp</b>', description: 'a & b' }],
      csrfToken,
      navigation,
      logoutAction: '/api/saml/idp/logout',
    });

    expect(html).toContain('&lt;b&gt;grupp&lt;/b&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).not.toContain('<b>grupp</b>');
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

  it('explains a failed local SAML test and names the missing attributes', () => {
    const html = renderSamlTest({
      navigation,
      samlLoginUrl: '/api/saml/login',
      error: 'SAML_MISSING_ATTRIBUTES',
      missingAttributes: ['surname', 'citizenIdentifier'],
    });

    expect(html).toContain('SAML-inloggningen misslyckades');
    expect(html).toContain('surname, citizenIdentifier');
    expect(html).toContain('Kända identitetsattribut');
    expect(html).toContain('Felkod: SAML_MISSING_ATTRIBUTES');
  });

  it('falls back to the raw code for an unknown failure and always explains the test', () => {
    const html = renderSamlTest({ navigation, samlLoginUrl: '/api/saml/login', error: 'WAT' });

    expect(html).toContain('Felkod: WAT');
    expect(html).toContain('Så går testet till');
    expect(html).toContain('Service Provider');
  });

  it('says that a value is missing instead of rendering an empty attribute', () => {
    const html = renderSamlTest({
      identity: { name: 'Test Person' },
      navigation,
      samlLoginUrl: '/api/saml/login',
    });

    expect(html).toContain('saknas i SAML-svaret');
    expect(html).not.toContain('undefined');
  });

  it('leaves the password optional in manual login, where the backend determines the user policy', () => {
    const html = renderLogin({ action: '/authenticate', csrfToken, navigation, users: [], enumerateUsers: false });
    expect(html).toContain('Lösenord (om det krävs)');
    expect(html).toContain('name="password" autocomplete="current-password" />');
    expect(html).not.toContain('name="userid"');
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
      users: [{ id: 'id"', name: '<b>Person</b>', username: 'test&person', requirePassword: false }],
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
