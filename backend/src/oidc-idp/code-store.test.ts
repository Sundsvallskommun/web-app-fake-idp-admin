import { AuthorizationCode, AuthorizationCodeStore } from './code-store';

vi.mock('@config', () => ({ OIDC_CODE_TTL: 120 }));

const grant: AuthorizationCode = {
  clientId: 'test-client',
  userId: 'user-1',
  redirectUri: 'https://rp.test/callback',
  scope: ['openid', 'profile'],
  nonce: 'nonce-1',
  authTime: 1_700_000_000,
};

describe('AuthorizationCodeStore', () => {
  it('round-trips a grant and returns it exactly once', () => {
    const store = new AuthorizationCodeStore(120);
    const code = store.issue(grant);

    expect(store.consume(code)).toEqual(grant);
    // A replayed code is the classic authorization-code attack; it must not work.
    expect(store.consume(code)).toBeNull();
  });

  it('refuses an expired code', () => {
    const store = new AuthorizationCodeStore(60);
    const code = store.issue(grant, 1_000);

    expect(store.consume(code, 1_000 + 60_001)).toBeNull();
  });

  it('honours a code right up to its expiry', () => {
    const store = new AuthorizationCodeStore(60);
    const code = store.issue(grant, 1_000);

    expect(store.consume(code, 1_000 + 59_999)).toEqual(grant);
  });

  it('returns null for a code it never issued', () => {
    expect(new AuthorizationCodeStore(60).consume('not-a-code')).toBeNull();
  });

  it('sweeps expired codes on write so the map cannot grow without bound', () => {
    const store = new AuthorizationCodeStore(60);
    store.issue(grant, 1_000);
    store.issue(grant, 1_000);
    expect(store.size).toBe(2);

    store.issue(grant, 1_000 + 60_001);
    expect(store.size).toBe(1);
  });

  it('issues unpredictable, distinct codes', () => {
    const store = new AuthorizationCodeStore(60);
    const codes = new Set(Array.from({ length: 50 }, () => store.issue(grant)));

    expect(codes.size).toBe(50);
    for (const code of codes) {
      expect(code.length).toBeGreaterThanOrEqual(42);
    }
  });
});
