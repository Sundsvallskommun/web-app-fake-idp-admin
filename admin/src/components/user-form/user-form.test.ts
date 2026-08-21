import { AdminUser } from '@data-contracts/backend/data-contracts';
import { describe, expect, it } from 'vitest';
import { applicationsForGroups, createEmptyUserForm, userFormToPayload, userToForm } from './user-form.model';
import { SAML_BASIC_FORMAT, userAttributeDefinitions, XML_SCHEMA_STRING } from './user-form.schema';

const attribute = (id: number, key: string, value: string) => ({
  id,
  key,
  value,
  format: SAML_BASIC_FORMAT,
  type: XML_SCHEMA_STRING,
});

describe('user form model', () => {
  it('creates one optional form field for every known claim', () => {
    const form = createEmptyUserForm();

    expect(form).toMatchObject({ name: '', username: '', password: '', customAttributes: [], groupIds: [] });
    expect(form.knownAttributes).toHaveLength(userAttributeDefinitions.length);
    expect(form.knownAttributes.every(({ value }) => value === '')).toBe(true);
  });

  it('derives unique application access from the selected groups', () => {
    const draken = { id: 1, name: 'Draken', description: '' };
    const katla = { id: 2, name: 'Katla', description: '' };
    const groups = [
      { id: 7, name: 'editors', description: '', userCount: 1, users: [], applications: [katla, draken] },
      { id: 8, name: 'reviewers', description: '', userCount: 1, users: [], applications: [draken] },
      { id: 9, name: 'unselected', description: '', userCount: 0, users: [], applications: [] },
    ];

    expect(applicationsForGroups(groups, [7, 8])).toEqual([draken, katla]);
  });

  it('maps known claims to schema fields and preserves unknown and duplicate claims', () => {
    const user: AdminUser = {
      id: 'user-1',
      name: 'Testperson',
      username: 'testperson',
      password: 'secret',
      applications: [{ id: 1, name: 'draken', description: '' }],
      groups: [{ id: 7, name: 'editor', description: 'Can edit' }],
      attributes: [
        attribute(1, 'givenName', 'Test'),
        attribute(2, 'givenName', 'Duplicate'),
        attribute(3, 'applicationRole', 'editor'),
      ],
    };

    const form = userToForm(user);
    const givenNameIndex = userAttributeDefinitions.findIndex(({ key }) => key === 'givenName');

    expect(form.knownAttributes[givenNameIndex].value).toBe('Test');
    expect(form.groupIds).toEqual([7]);
    expect(form.customAttributes).toEqual([
      expect.objectContaining({ key: 'givenName', value: 'Duplicate' }),
      expect.objectContaining({ key: 'applicationRole', value: 'editor' }),
    ]);
  });

  it('builds SAML attributes from populated schema fields and omits blank fields', () => {
    const form = createEmptyUserForm();
    form.name = 'Testperson';
    form.username = 'testperson';
    form.password = 'secret';
    form.groupIds = [7];
    form.customAttributes = [
      { key: 'applicationRole', value: 'editor', format: '', type: '' },
      { key: 'emptyClaim', value: '  ', format: SAML_BASIC_FORMAT, type: XML_SCHEMA_STRING },
    ];

    expect(userFormToPayload(form)).toEqual({
      name: 'Testperson',
      username: 'testperson',
      password: 'secret',
      attributes: [{ key: 'applicationRole', value: 'editor', format: SAML_BASIC_FORMAT, type: XML_SCHEMA_STRING }],
      groupIds: [7],
    });
  });
});
