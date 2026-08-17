import { SAML_IDP_PRIVATE_KEY } from '@config';
import { DOMParser } from '@xmldom/xmldom';
import { createPublicKey } from 'crypto';
import { SignedXml } from 'xml-crypto';
import { describe, expect, it } from 'vitest';
import { createResponse, type UserWithAttributes } from './response-builder';

const user: UserWithAttributes = {
  id: 'user-1',
  name: 'Test User',
  username: 'test-user',
  password: 'test-only',
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
};

describe('SAML response signing contract', () => {
  it('keeps the externally visible RSA-SHA1 contract and produces a verifiable signature', () => {
    const response = createResponse(
      {
        destination: 'https://service-provider.test/saml/acs',
        inResponseTo: '_request-1',
        relayState: 'return-here',
      },
      user,
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
