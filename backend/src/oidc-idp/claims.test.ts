import { ClaimsSubject, claimsForUser, claimsPreviewForUser, filterClaimsByScope } from './claims';

const subject = (overrides: Partial<ClaimsSubject> = {}): ClaimsSubject => ({
  id: 'user-1',
  name: 'Test Person',
  username: 'test.person',
  attributes: [],
  groups: [],
  ...overrides,
});

describe('claimsForUser', () => {
  it('maps SAML attribute keys onto their standard OIDC counterparts', () => {
    const claims = claimsForUser(
      subject({
        attributes: [
          { key: 'givenName', value: 'Test' },
          { key: 'surname', value: 'Person' },
          { key: 'email', value: 'test@example.test' },
        ],
      }),
    );

    expect(claims).toMatchObject({
      sub: 'user-1',
      name: 'Test Person',
      preferred_username: 'test.person',
      given_name: 'Test',
      family_name: 'Person',
      email: 'test@example.test',
      email_verified: true,
    });
  });

  it('maps the LDAP OIDs the seeded catalogue uses', () => {
    const claims = claimsForUser(
      subject({
        attributes: [
          { key: 'urn:oid:2.5.4.42', value: 'Test' },
          { key: 'urn:oid:0.9.2342.19200300.100.1.3', value: 'oid@example.test' },
        ],
      }),
    );

    expect(claims.given_name).toBe('Test');
    expect(claims.email).toBe('oid@example.test');
  });

  it('keeps non-standard attributes under their own key', () => {
    const claims = claimsForUser(subject({ attributes: [{ key: 'citizenIdentifier', value: '196001011234' }] }));

    expect(claims.citizenIdentifier).toBe('196001011234');
  });

  it('emits relational groups as an array, not the SAML CSV string', () => {
    const claims = claimsForUser(subject({ groups: [{ name: 'developers' }, { name: 'testers' }] }));

    expect(claims.groups).toEqual(['developers', 'testers']);
  });

  it('ignores a legacy CSV groups attribute so memberships cannot contradict themselves', () => {
    const claims = claimsForUser(
      subject({
        attributes: [{ key: 'groups', value: 'stale,from,users.js' }],
        groups: [{ name: 'developers' }],
      }),
    );

    expect(claims.groups).toEqual(['developers']);
  });

  // Seen in a real catalogue: urn:oid uid restating User.username produced
  // preferred_username = "j2lindkv, j2lindkv".
  it('does not duplicate a value an attribute merely restates', () => {
    const claims = claimsForUser(
      subject({
        username: 'j2lindkv',
        attributes: [{ key: 'urn:oid:0.9.2342.19200300.100.1.1', value: 'j2lindkv' }],
      }),
    );

    expect(claims.preferred_username).toBe('j2lindkv');
  });

  it('still keeps a genuinely different value for the same claim', () => {
    const claims = claimsForUser(
      subject({
        username: 'j2lindkv',
        attributes: [{ key: 'urn:oid:0.9.2342.19200300.100.1.1', value: 'other.name' }],
      }),
    );

    expect(claims.preferred_username).toEqual(['j2lindkv', 'other.name']);
  });

  it('collapses a repeated attribute key into an array rather than losing values', () => {
    const claims = claimsForUser(
      subject({
        attributes: [
          { key: 'role', value: 'admin' },
          { key: 'role', value: 'auditor' },
        ],
      }),
    );

    expect(claims.role).toEqual(['admin', 'auditor']);
  });
});

describe('filterClaimsByScope', () => {
  const claims = claimsForUser(
    subject({
      attributes: [
        { key: 'givenName', value: 'Test' },
        { key: 'email', value: 'test@example.test' },
        { key: 'citizenIdentifier', value: '196001011234' },
      ],
      groups: [{ name: 'developers' }],
    }),
  );

  it('drops profile and email claims when only openid is granted', () => {
    const filtered = filterClaimsByScope(claims, ['openid']);

    expect(filtered.sub).toBe('user-1');
    expect(filtered.given_name).toBeUndefined();
    expect(filtered.name).toBeUndefined();
    expect(filtered.email).toBeUndefined();
  });

  it('unlocks each standard claim group with its own scope', () => {
    expect(filterClaimsByScope(claims, ['openid', 'profile']).given_name).toBe('Test');
    expect(filterClaimsByScope(claims, ['openid', 'profile']).email).toBeUndefined();
    expect(filterClaimsByScope(claims, ['openid', 'email']).email).toBe('test@example.test');
  });

  it('always keeps groups and custom attribute claims, mirroring the SAML assertion', () => {
    const filtered = filterClaimsByScope(claims, ['openid']);

    expect(filtered.groups).toEqual(['developers']);
    expect(filtered.citizenIdentifier).toBe('196001011234');
  });
});

describe('claimsPreviewForUser', () => {
  const preview = claimsPreviewForUser(
    subject({
      attributes: [
        { key: 'givenName', value: 'Test' },
        { key: 'email', value: 'test@example.test' },
      ],
      groups: [{ name: 'developers' }, { name: 'testers' }],
    }),
  );
  const byName = (name: string) => preview.claims.find(claim => claim.name === name);

  it('lifts sub out, mirroring the assertion preview nameId', () => {
    expect(preview.sub).toBe('user-1');
    expect(byName('sub')).toBeUndefined();
  });

  it('renders every value to text so the admin table stays dumb', () => {
    expect(byName('given_name')).toEqual({ name: 'given_name', value: 'Test', type: 'string' });
    expect(byName('email_verified')).toEqual({ name: 'email_verified', value: 'true', type: 'boolean' });
  });

  it('marks groups as an array — the difference from the SAML CSV attribute', () => {
    expect(byName('groups')).toEqual({ name: 'groups', value: 'developers, testers', type: 'array' });
  });
});
