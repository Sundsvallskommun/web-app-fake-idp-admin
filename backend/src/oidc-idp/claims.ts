import type { Attribute, Group, User } from '@prisma/client';

/**
 * The projection input. Structurally the same shape the SAML response builder
 * consumes (`UserWithAttributes`), stated independently so the OIDC role does not
 * depend on the SAML role.
 */
export type ClaimsSubject = Pick<User, 'id' | 'name' | 'username'> & {
  attributes: Pick<Attribute, 'key' | 'value'>[];
  groups: Pick<Group, 'name'>[];
};

export type ClaimValue = string | string[] | boolean;
export type Claims = Record<string, ClaimValue>;

/**
 * SAML attribute keys are free-form and, in this catalogue, mostly SAML-flavoured
 * (`givenName`, `surname`) or LDAP OIDs. OIDC has a fixed vocabulary, so the keys
 * that have a standard counterpart are renamed; every other attribute is emitted
 * verbatim as a custom claim, which is what makes `citizenIdentifier` survive.
 */
const STANDARD_CLAIM_BY_ATTRIBUTE: Record<string, string> = {
  givenName: 'given_name',
  given_name: 'given_name',
  firstName: 'given_name',
  surname: 'family_name',
  sn: 'family_name',
  family_name: 'family_name',
  lastName: 'family_name',
  displayName: 'name',
  email: 'email',
  mail: 'email',
  phone: 'phone_number',
  phoneNumber: 'phone_number',
  locale: 'locale',
  // LDAP OIDs, as handed out by several Swedish IdPs and present in seeded data.
  'urn:oid:2.5.4.42': 'given_name',
  'urn:oid:2.5.4.4': 'family_name',
  'urn:oid:0.9.2342.19200300.100.1.1': 'preferred_username',
  'urn:oid:0.9.2342.19200300.100.1.3': 'email',
  'urn:oid:2.16.840.1.113730.3.1.241': 'name',
};

/**
 * Claims a scope unlocks, per OpenID Connect Core 5.4. `sub` is unconditional;
 * `groups` and any non-standard attribute claim are also unconditional, mirroring
 * the SAML assertion, which always carries every attribute the user owns.
 */
const CLAIMS_BY_SCOPE: Record<string, string[]> = {
  profile: [
    'name',
    'family_name',
    'given_name',
    'middle_name',
    'nickname',
    'preferred_username',
    'profile',
    'picture',
    'website',
    'gender',
    'birthdate',
    'zoneinfo',
    'locale',
    'updated_at',
  ],
  email: ['email', 'email_verified'],
  phone: ['phone_number', 'phone_number_verified'],
  address: ['address'],
};

/** Every claim name that any scope gates. Anything outside this set is always emitted. */
const SCOPED_CLAIM_NAMES = new Set(Object.values(CLAIMS_BY_SCOPE).flat());

/** The `groups` claim mirrors the SAML attribute, but as a JSON array rather than a CSV string. */
export const GROUPS_CLAIM = 'groups';

export const SUPPORTED_SCOPES = ['openid', 'profile', 'email', 'phone', 'address'] as const;

/**
 * Attributes may repeat with the same key (SAML permits multi-valued attributes),
 * so a repeated key collapses into an array rather than silently losing values.
 *
 * Identical values are dropped, not appended: several catalogues carry an attribute
 * that simply restates a field already taken from the user record (`urn:oid:…100.1.1`
 * next to `User.username`), and emitting `["x","x"]` for it is noise, not data.
 */
const addValue = (claims: Claims, name: string, value: string): void => {
  const existing = claims[name];
  if (existing === undefined) {
    claims[name] = value;
    return;
  }

  const values = Array.isArray(existing) ? existing : [String(existing)];
  if (values.includes(value)) {
    return;
  }
  claims[name] = [...values, value];
};

/**
 * The canonical user -> claims projection, shared by the ID token, `/userinfo`
 * and (later) the admin preview — the OIDC counterpart of the SAML role's
 * `assertionDataForUser`. Returns every claim the user can produce; scope
 * narrowing is a separate step so a preview can show the whole set.
 */
export function claimsForUser(user: ClaimsSubject): Claims {
  const claims: Claims = {
    sub: user.id,
    name: user.name,
    preferred_username: user.username,
  };

  for (const attribute of user.attributes) {
    // The legacy CSV `groups` attribute is superseded by the relational groups
    // below; emitting both would contradict itself once memberships are edited.
    if (attribute.key === GROUPS_CLAIM) {
      continue;
    }
    addValue(claims, STANDARD_CLAIM_BY_ATTRIBUTE[attribute.key] ?? attribute.key, attribute.value);
  }

  const groups = [...new Set(user.groups.map(group => group.name.trim()).filter(Boolean))];
  if (groups.length > 0) {
    claims[GROUPS_CLAIM] = groups;
  }

  // A test catalogue has no verification workflow; an address that is present is
  // the address the operator typed, so claiming otherwise would just break RPs
  // that gate on the flag.
  if (claims.email !== undefined) {
    claims.email_verified = true;
  }
  if (claims.phone_number !== undefined) {
    claims.phone_number_verified = true;
  }

  return claims;
}

/**
 * The admin preview projection: the same claims a token would carry, rendered to
 * text. `type` is kept because the SAML/OIDC difference an operator most often
 * needs to see is that `groups` is a JSON array here and a comma-separated string
 * there. `sub` is lifted out to mirror the assertion preview's `nameId`.
 */
export function claimsPreviewForUser(user: ClaimsSubject): { sub: string; claims: Array<{ name: string; value: string; type: string }> } {
  const claims = claimsForUser(user);

  return {
    sub: String(claims.sub),
    claims: Object.entries(claims)
      .filter(([name]) => name !== 'sub')
      .map(([name, value]) => ({
        name,
        value: Array.isArray(value) ? value.join(', ') : String(value),
        type: Array.isArray(value) ? 'array' : typeof value === 'boolean' ? 'boolean' : 'string',
      })),
  };
}

/**
 * Narrow a full claim set to what the granted scopes allow. `sub` always survives;
 * so does anything no scope gates (`groups`, `citizenIdentifier`, other custom
 * attributes) — see CLAIMS_BY_SCOPE.
 */
export function filterClaimsByScope(claims: Claims, scopes: string[]): Claims {
  const granted = new Set(scopes.flatMap(scope => CLAIMS_BY_SCOPE[scope] ?? []));

  return Object.fromEntries(Object.entries(claims).filter(([name]) => name === 'sub' || !SCOPED_CLAIM_NAMES.has(name) || granted.has(name)));
}
