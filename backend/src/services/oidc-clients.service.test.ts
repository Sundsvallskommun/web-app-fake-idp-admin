import { generateClientSecret, toOidcClient } from './oidc-clients.service';

vi.mock('@utils/prisma', () => ({ default: {} }));

const row = (overrides: Partial<Parameters<typeof toOidcClient>[0]> = {}) => ({
  id: 1,
  clientId: 'rp-1',
  clientSecret: 'secret',
  name: 'RP',
  description: '',
  redirectUris: '["https://rp.test/callback"]',
  postLogoutRedirectUris: '[]',
  requirePkce: true,
  isPublic: false,
  applicationId: null,
  application: null,
  ...overrides,
});

describe('toOidcClient', () => {
  it('turns the JSON-encoded URI columns back into arrays', () => {
    const client = toOidcClient(row({ postLogoutRedirectUris: '["https://rp.test/bye"]' }));

    expect(client.redirectUris).toEqual(['https://rp.test/callback']);
    expect(client.postLogoutRedirectUris).toEqual(['https://rp.test/bye']);
  });

  it('survives a malformed column rather than taking the endpoint down', () => {
    // SQLite has no array type, so the column is only ever as valid as what wrote
    // it; a hand-edited database must not 500 the whole admin list.
    expect(toOidcClient(row({ redirectUris: 'not json' })).redirectUris).toEqual([]);
    expect(toOidcClient(row({ redirectUris: '{"not":"an array"}' })).redirectUris).toEqual([]);
    expect(toOidcClient(row({ redirectUris: '["ok", 42, null]' })).redirectUris).toEqual(['ok']);
  });

  it('passes the linked application through for the access view', () => {
    const client = toOidcClient(row({ applicationId: 7, application: { id: 7, name: 'Draken' } }));

    expect(client.applicationId).toBe(7);
    expect(client.application).toEqual({ id: 7, name: 'Draken' });
  });
});

describe('generateClientSecret', () => {
  it('produces distinct, URL-safe secrets', () => {
    const secrets = new Set(Array.from({ length: 25 }, generateClientSecret));

    expect(secrets.size).toBe(25);
    for (const secret of secrets) {
      // base64url: safe to paste into config files and query strings unescaped.
      expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });
});
