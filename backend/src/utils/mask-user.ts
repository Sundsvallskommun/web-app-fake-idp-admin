// `citizenIdentifier` (Swedish personnummer) can be a real, sensitive value even
// in this test IdP, and the admin UI only needs to show that a user HAS one — not
// what it is. So the admin HTTP responses mask these attribute values; the real
// values stay in the DB and are still issued in SAML assertions (the IdP reads
// straight from UsersService/Prisma, which is NOT masked).
//
// The mask is a fixed sentinel (non-numeric, so it can never collide with a real
// personnummer). It also round-trips: an update that submits the sentinel back
// means "unchanged", and UsersService.updateUser restores the stored value rather
// than overwriting it with the mask. See users.service.ts.
export const MASKED_VALUE = '••••••••••••';

// Attribute keys whose values must never leave the backend in clear text.
const MASKED_ATTRIBUTE_KEYS = new Set(['citizenIdentifier']);

export const isMaskedAttributeKey = (key: string) => MASKED_ATTRIBUTE_KEYS.has(key);

type WithAttributes = { attributes: { key: string; value: string }[] };

// Return a copy of the user with sensitive attribute values replaced by the mask.
// Empty values are left as-is so an absent attribute still renders an empty cell.
export const maskUser = <T extends WithAttributes>(user: T): T =>
  ({
    ...user,
    attributes: user.attributes.map(attribute =>
      isMaskedAttributeKey(attribute.key) && attribute.value ? { ...attribute, value: MASKED_VALUE } : attribute,
    ),
  }) as T;
