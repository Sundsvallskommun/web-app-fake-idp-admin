import { AdminUser, AttributeDto, CreateUserDto } from '@data-contracts/backend/data-contracts';
import { SAML_BASIC_FORMAT, userAttributeDefinitions, XML_SCHEMA_STRING } from './user-form.schema';

export type UserFormAttribute = Pick<AttributeDto, 'key' | 'format' | 'value' | 'type'>;

export type UserForm = Pick<CreateUserDto, 'name' | 'username' | 'password'> & {
  knownAttributes: Array<{ value: string }>;
  customAttributes: UserFormAttribute[];
  groupIds: number[];
};

export const emptyCustomAttribute = (): UserFormAttribute => ({
  key: '',
  format: SAML_BASIC_FORMAT,
  value: '',
  type: XML_SCHEMA_STRING,
});

export const createEmptyUserForm = (): UserForm => ({
  name: '',
  username: '',
  password: '',
  knownAttributes: userAttributeDefinitions.map(() => ({ value: '' })),
  customAttributes: [],
  groupIds: [],
});

export const userToForm = (user: AdminUser): UserForm => {
  const unmatchedAttributes: UserFormAttribute[] = user.attributes.map(({ key, format, value, type }) => ({
    key,
    format,
    value,
    type,
  }));

  const knownAttributes = userAttributeDefinitions.map((definition) => {
    const attributeIndex = unmatchedAttributes.findIndex((candidate) => candidate.key === definition.key);
    if (attributeIndex === -1) {
      return { value: '' };
    }

    const [matchedAttribute] = unmatchedAttributes.splice(attributeIndex, 1);
    return { value: matchedAttribute.value };
  });

  return {
    name: user.name,
    username: user.username,
    password: user.password,
    knownAttributes,
    // Unknown claims, and any duplicate occurrence of a known claim, stay fully
    // editable so loading and saving a user never silently drops them.
    customAttributes: unmatchedAttributes,
    groupIds: user.groups.map((group) => group.id),
  };
};

const hasText = (value: string): boolean => value.trim().length > 0;

export const userFormToPayload = (form: UserForm): CreateUserDto => {
  const knownAttributes: AttributeDto[] = userAttributeDefinitions.flatMap((definition, index) => {
    const value = form.knownAttributes[index]?.value ?? '';
    return hasText(value) ? [{ key: definition.key, format: definition.format, value, type: definition.type }] : [];
  });

  const customAttributes: AttributeDto[] = form.customAttributes
    .filter((attribute) => hasText(attribute.key) && hasText(attribute.value))
    .map((attribute) => ({
      key: attribute.key,
      value: attribute.value,
      format: hasText(attribute.format) ? attribute.format : SAML_BASIC_FORMAT,
      type: hasText(attribute.type) ? attribute.type : XML_SCHEMA_STRING,
    }));

  return {
    name: form.name,
    username: form.username,
    password: form.password,
    attributes: [...knownAttributes, ...customAttributes],
    groupIds: form.groupIds,
  };
};
