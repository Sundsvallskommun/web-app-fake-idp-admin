import { CreateUserDto } from '@data-contracts/backend/data-contracts';

export const SAML_BASIC_FORMAT = 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic';
export const XML_SCHEMA_STRING = 'xs:string';

type UserPropertyKey = keyof Pick<CreateUserDto, 'name' | 'username' | 'password'>;

export type UserPropertyDefinition = {
  key: UserPropertyKey;
  labelKey: string;
  inputType: 'text' | 'password';
  required: boolean;
};

export const userPropertyDefinitions = [
  { key: 'name', labelKey: 'users:properties.name', inputType: 'text', required: true },
  { key: 'username', labelKey: 'users:properties.username', inputType: 'text', required: true },
  { key: 'password', labelKey: 'users:properties.password', inputType: 'password', required: true },
] as const satisfies readonly UserPropertyDefinition[];

export type UserAttributeDefinition = {
  key: string;
  labelKey: string;
  format: typeof SAML_BASIC_FORMAT;
  type: typeof XML_SCHEMA_STRING;
  /**
   * `standard` = det claim SAML-svaret normalt innehåller.
   * `alias` = kompatibilitetsnamn för samma uppgift (LDAP/katalogstandard eller
   * äldre appar) — fylls i med samma värde som standardfältet när en ansluten
   * app kräver just den nyckeln.
   */
  group: 'standard' | 'alias';
};

const attribute = (key: string, labelKey: string, group: 'standard' | 'alias'): UserAttributeDefinition => ({
  key,
  labelKey,
  format: SAML_BASIC_FORMAT,
  type: XML_SCHEMA_STRING,
  group,
});

/**
 * Known claims found in the existing user export. Claim names are deliberately
 * case-sensitive: SAML consumers may distinguish `givenName`, `givenname`, and
 * other compatibility aliases, so they must not be silently merged.
 *
 * These claims are optional. A blank form field is omitted from the payload and
 * therefore does not produce an empty SAML Attribute.
 */
export const userAttributeDefinitions = [
  attribute('givenName', 'users:known_attributes.given_name', 'standard'),
  attribute('surname', 'users:known_attributes.surname', 'standard'),
  attribute('citizenIdentifier', 'users:known_attributes.citizen_identifier', 'standard'),
  attribute('username', 'users:known_attributes.username', 'standard'),
  attribute('email', 'users:known_attributes.email', 'standard'),
  attribute('urn:oid:0.9.2342.19200300.100.1.1', 'users:known_attributes.uid_oid', 'alias'),
  attribute('sn', 'users:known_attributes.sn', 'alias'),
  attribute('uid', 'users:known_attributes.uid', 'alias'),
  attribute('givenname', 'users:known_attributes.given_name_lowercase', 'alias'),
  attribute('Surname', 'users:known_attributes.surname_uppercase', 'alias'),
  attribute('firstname', 'users:known_attributes.firstname', 'alias'),
  attribute('orgTree', 'users:known_attributes.org_tree', 'alias'),
  attribute('userid', 'users:known_attributes.user_id', 'alias'),
] as const satisfies readonly UserAttributeDefinition[];
