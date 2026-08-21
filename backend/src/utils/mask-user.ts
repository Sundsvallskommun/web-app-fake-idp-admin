// `citizenIdentifier` (Swedish personnummer) can be a real, sensitive value even
// in this test IdP. Regular admin HTTP responses therefore mask these attribute
// values. The real value only leaves the backend through the explicit,
// authenticated reveal endpoint or in SAML assertions (the IdP reads straight
// from UsersService/Prisma, which is NOT masked).
//
// The mask is a fixed sentinel (non-numeric, so it can never collide with a real
// personnummer). It also round-trips: an update that submits the sentinel back
// means "unchanged", and UsersService.updateUser restores the stored value rather
// than overwriting it with the mask. See users.service.ts.
export const MASKED_VALUE = '••••••••••••';
export const CITIZEN_IDENTIFIER_KEY = 'citizenIdentifier';

// Attribute keys whose values must never leave the backend in clear text.
const MASKED_ATTRIBUTE_KEYS = new Set([CITIZEN_IDENTIFIER_KEY]);

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
