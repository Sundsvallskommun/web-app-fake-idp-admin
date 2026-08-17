import { createResponse, type UserWithAttributes } from './response-builder';

jest.mock('@config', () => {
  const { generateKeyPairSync } = jest.requireActual<typeof import('crypto')>('crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

  return {
    SAML_IDP_ENTITY_ID: 'https://fake-idp.test/api/saml/idp/metadata',
    SAML_IDP_PRIVATE_KEY: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    SAML_ISSUER: 'contract-sp',
    SAML_SP_AUDIENCE: 'contract-sp',
  };
});

const user: UserWithAttributes = {
  id: 'user-1',
  name: 'Test User',
  username: 'test-user',
  password: 'test-only',
  attributes: [],
  groups: [
    { id: 1, name: 'editor', description: '' },
    { id: 2, name: 'reviewer', description: '' },
  ],
};

describe('SAML group claim', () => {
  it('serializes normalized memberships using the established claim format', () => {
    const response = createResponse(
      {
        destination: 'https://service-provider.test/saml/acs',
        inResponseTo: '_request-1',
      },
      user,
    );
    const signedXml = Buffer.from(response.samlResponse, 'base64').toString('utf8');

    expect(signedXml).toContain('Name="groups"');
    expect(signedXml).toContain('>editor,reviewer</saml2:AttributeValue>');
  });
});
