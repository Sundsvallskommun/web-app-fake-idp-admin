import { SAML_IDP_PRIVATE_KEY } from '@config';
import { DOMParser } from '@xmldom/xmldom';
import { createPublicKey } from 'crypto';
import { SignedXml } from 'xml-crypto';
import { describe, expect, it, vi } from 'vitest';
import { createResponse, type UserWithAttributes } from './response-builder';

// Hermetisk config: genererar ett eget nyckelpar så testet inte beror på
// miljövariabler. vi.mock hissas, så importen ovan får det mockade värdet.
vi.mock('@config', async () => {
  const { generateKeyPairSync } = await vi.importActual<typeof import('crypto')>('crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

  return {
    SAML_IDP_ENTITY_ID: 'https://fake-idp.test/api/saml/idp/metadata',
    SAML_IDP_PRIVATE_KEY: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    SAML_ISSUER: 'contract-sp',
    SAML_SP_AUDIENCE: 'contract-sp',
  };
});

const signingUser: UserWithAttributes = {
  id: 'user-1',
  name: 'Test User',
  username: 'test-user',
  password: 'test-only',
  requirePassword: false,
  attributes: [
    {
      id: 1,
      userId: 'user-1',
      key: 'givenName',
      format: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
      value: 'Test',
      type: 'xs:string',
    },
  ],
  groups: [],
};

const groupUser: UserWithAttributes = {
  id: 'user-1',
  name: 'Test User',
  username: 'test-user',
  password: 'test-only',
  requirePassword: false,
  attributes: [],
  groups: [
    { id: 1, name: 'editor', description: '' },
    { id: 2, name: 'reviewer', description: '' },
  ],
};

describe('SAML response signing contract', () => {
  it('keeps the externally visible RSA-SHA1 contract and produces a verifiable signature', () => {
    const response = createResponse(
      {
        destination: 'https://service-provider.test/saml/acs',
        inResponseTo: '_request-1',
        relayState: 'return-here',
      },
      signingUser,
    );
    const signedXml = Buffer.from(response.samlResponse, 'base64').toString('utf8');
    const document = new DOMParser().parseFromString(signedXml, 'text/xml');
    const signature = document.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature').item(0);

    expect(signature).not.toBeNull();
    expect(signedXml).toContain('http://www.w3.org/2000/09/xmldsig#rsa-sha1');
    expect(signedXml).toContain('http://www.w3.org/2000/09/xmldsig#sha1');

    const verifier = new SignedXml({ publicCert: createPublicKey(SAML_IDP_PRIVATE_KEY) });
    verifier.loadSignature(signature!);

    expect(verifier.checkSignature(signedXml)).toBe(true);
    expect(response.relayState).toBe('return-here');
  });
});

describe('SAML group claim', () => {
  it('serializes normalized memberships using the established claim format', () => {
    const response = createResponse(
      {
        destination: 'https://service-provider.test/saml/acs',
        inResponseTo: '_request-1',
      },
      groupUser,
    );
    const signedXml = Buffer.from(response.samlResponse, 'base64').toString('utf8');

    expect(signedXml).toContain('Name="groups"');
    expect(signedXml).toContain('>editor,reviewer</saml2:AttributeValue>');
  });
});
