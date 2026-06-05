import { SAML_IDP_ENTITY_ID, SAML_IDP_PRIVATE_KEY, SAML_ISSUER, SAML_SP_AUDIENCE } from '@config';
import type { Attribute, User } from '@prisma/client';
import { SignedXml } from 'xml-crypto';
import { buildResponseXml } from './assertion-template';
import type { ParsedAuthnRequest } from './request-parser';
import { createId, createSessionId, normalizePem } from './util';

export type UserWithAttributes = User & { attributes: Attribute[] };

export interface BuiltResponse {
  /** SP ACS URL the auto-submitting form POSTs to. */
  action: string;
  /** base64-encoded signed SAML Response. */
  samlResponse: string;
  relayState?: string;
}

// Validity window for the assertion (minutes), matching the original fake-sso-idp.
const ASSERTION_TTL_MINUTES = 500;

// SubjectLocality / SubjectConfirmationData Address. Not validated by node-saml;
// kept as a stable placeholder rather than pulling in the `ip` package.
const IDP_ADDRESS = '127.0.0.1';

const ENVELOPED_SIGNATURE = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const EXC_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#';
const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1';

/**
 * Sign the Assertion in-place (enveloped, exclusive-c14n, SHA-1) and insert the
 * <ds:Signature> after the Assertion's <Issuer>. Ported from fake-sso-idp's
 * `sign`, adapted to the xml-crypto v6 API (options object + `privateKey`).
 *
 * SHA-1 is retained for parity with the original and the SP's expectations;
 * this is a test/simulator IdP.
 */
function sign(xml: string): string {
  const assertionXpath = "/*[local-name()='Response']/*[local-name()='Assertion']";
  const sig = new SignedXml({
    privateKey: normalizePem(SAML_IDP_PRIVATE_KEY),
    signatureAlgorithm: RSA_SHA1,
    canonicalizationAlgorithm: EXC_C14N,
  });
  sig.addReference({
    xpath: assertionXpath,
    transforms: [ENVELOPED_SIGNATURE, EXC_C14N],
    digestAlgorithm: SHA1,
  });
  sig.computeSignature(xml, {
    prefix: 'ds',
    location: { reference: `${assertionXpath}/*[local-name()='Issuer']`, action: 'after' },
  });
  return sig.getSignedXml();
}

/**
 * Build a signed SAML Response for `user` in answer to a parsed AuthnRequest.
 * Ported from fake-sso-idp `createResponse`.
 */
export function createResponse(request: ParsedAuthnRequest, user: UserWithAttributes): BuiltResponse {
  const now = new Date();
  const issueInstant = now.toISOString();
  const notOnOrAfter = new Date(now.getTime() + ASSERTION_TTL_MINUTES * 60 * 1000).toISOString();

  const entity = SAML_IDP_ENTITY_ID;
  const audience = SAML_SP_AUDIENCE || SAML_ISSUER;
  const sessionIndex = createSessionId();

  const xml = buildResponseXml({
    destination: request.destination,
    id: createId(entity),
    inResponseTo: request.inResponseTo,
    issueInstant,
    entity,
    assertionId: createId(`${entity}:${user.id}:${sessionIndex}`),
    nameQualifier: entity,
    spNameQualifier: audience,
    address: IDP_ADDRESS,
    notOnOrAfter,
    notBefore: issueInstant,
    audience,
    authnInstant: issueInstant,
    sessionIndex,
    nameId: user.id,
    attributes: user.attributes,
  });

  const signedXml = sign(xml);

  return {
    action: request.destination,
    samlResponse: Buffer.from(signedXml, 'utf8').toString('base64'),
    relayState: request.relayState,
  };
}
