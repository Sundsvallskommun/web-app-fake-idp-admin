import { IDP_PUBLIC_PATH, SAML_IDP_ENTITY_ID, SAML_IDP_PUBLIC_CERT } from '@config';
import { pemCertBody, xmlEscape } from './util';

const HTTP_REDIRECT = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';
const HTTP_POST = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';

/** Absolute URL of the IdP SSO endpoint, derived from the IdP entityID's origin. */
function ssoUrl(): string {
  let origin: string;
  try {
    origin = new URL(SAML_IDP_ENTITY_ID).origin;
  } catch {
    origin = '';
  }
  return `${origin}${IDP_PUBLIC_PATH}/sso`;
}

/**
 * IdP metadata (EntityDescriptor / IDPSSODescriptor) so a Service Provider can
 * be configured to trust this IdP: entityID, signing cert, and the SSO endpoint
 * for both the HTTP-Redirect and HTTP-POST bindings.
 */
export function buildIdpMetadata(): string {
  const sso = ssoUrl();
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="${xmlEscape(SAML_IDP_ENTITY_ID)}">` +
    `<IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">` +
    `<KeyDescriptor use="signing">` +
    `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${pemCertBody(SAML_IDP_PUBLIC_CERT)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>` +
    `</KeyDescriptor>` +
    `<SingleSignOnService Binding="${HTTP_REDIRECT}" Location="${xmlEscape(sso)}"/>` +
    `<SingleSignOnService Binding="${HTTP_POST}" Location="${xmlEscape(sso)}"/>` +
    `</IDPSSODescriptor>` +
    `</EntityDescriptor>`
  );
}
