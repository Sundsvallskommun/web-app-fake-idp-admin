import { DOMParser } from '@xmldom/xmldom';
import { promisify } from 'util';
import { inflateRaw } from 'zlib';

const inflateRawAsync = promisify(inflateRaw);

export interface ParsedAuthnRequest {
  /** SP AssertionConsumerServiceURL — where the signed Response is POSTed back. */
  destination: string;
  /** The AuthnRequest ID, echoed back as the Response's InResponseTo. */
  inResponseTo: string;
  /** The SP's entity ID (Issuer element). Used as assertion Audience so any SP gets a correctly-scoped assertion. */
  issuer?: string;
  /** Opaque value the SP wants returned alongside the Response. */
  relayState?: string;
}

/**
 * Parse an inbound SAML AuthnRequest (HTTP-Redirect or HTTP-POST binding).
 *
 * Ported from fake-sso-idp `parseRequest`: base64-decode the `SAMLRequest`,
 * raw-inflate it, then read the root element's `AssertionConsumerServiceURL`
 * and `ID` attributes. `RelayState` travels outside the XML (query/body).
 */
export async function parseRequest(source: { SAMLRequest?: string; RelayState?: string }): Promise<ParsedAuthnRequest> {
  if (!source || typeof source.SAMLRequest !== 'string' || source.SAMLRequest.length === 0) {
    throw new Error('Missing SAMLRequest');
  }

  const inflated = await inflateRawAsync(Buffer.from(source.SAMLRequest, 'base64'));
  const xml = inflated.toString('utf8');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  if (!root) {
    throw new Error('Could not parse SAMLRequest XML');
  }

  const issuerEl = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0];
  const issuer = issuerEl?.textContent?.trim() || root.getAttribute('Issuer') || undefined;

  return {
    destination: root.getAttribute('AssertionConsumerServiceURL') || '',
    inResponseTo: root.getAttribute('ID') || '',
    issuer: issuer || undefined,
    relayState: source.RelayState,
  };
}
