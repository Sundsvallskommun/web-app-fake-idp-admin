export const GROUP_ATTRIBUTE_KEY = 'groups';
export const SAML_BASIC_FORMAT = 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic';
export const XML_SCHEMA_STRING = 'xs:string';

export type SamlAttribute = {
  key: string;
  format: string;
  value: string;
  type: string;
};

export const parseGroupNames = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map(name => name.trim())
      .filter(Boolean),
  ),
];

export const groupNamesFromAttributes = (attributes: SamlAttribute[]): { found: boolean; names: string[] } => {
  const groupAttributes = attributes.filter(attribute => attribute.key === GROUP_ATTRIBUTE_KEY);
  return {
    found: groupAttributes.length > 0,
    names: [...new Set(groupAttributes.flatMap(attribute => parseGroupNames(attribute.value)))],
  };
};

export const withoutGroupAttributes = <T extends SamlAttribute>(attributes: T[]): T[] =>
  attributes.filter(attribute => attribute.key !== GROUP_ATTRIBUTE_KEY);

export const createGroupAttribute = (names: string[]): SamlAttribute | undefined => {
  const uniqueNames = [...new Set(names.map(name => name.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) {
    return undefined;
  }

  return {
    key: GROUP_ATTRIBUTE_KEY,
    format: SAML_BASIC_FORMAT,
    value: uniqueNames.join(','),
    type: XML_SCHEMA_STRING,
  };
};
