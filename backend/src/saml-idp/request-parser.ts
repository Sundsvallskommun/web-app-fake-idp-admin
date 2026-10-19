import { DOMParser } from '@xmldom/xmldom';
import { HttpException } from '@exceptions/HttpException';
import { promisify } from 'util';
import { inflateRaw } from 'zlib';

const inflateRawAsync = promisify(inflateRaw);

// Bound both the encoded form/query value and the inflated XML. The HTTP body
// limit alone cannot bound compressed input, and DOM parsing happens before login.
const MAX_ENCODED_REQUEST_LENGTH = 1024 * 1024;
const MAX_INFLATED_REQUEST_BYTES = 1024 * 1024;

export interface ParsedAuthnRequest {
  /** Discriminator for the shared `session.idpRequest` slot (see express-session.d.ts). */
  protocol: 'saml';
  /** SP AssertionConsumerServiceURL — where the signed Response is POSTed back. */
  destination: string;
  /** The AuthnRequest ID, echoed back as the Response's InResponseTo. */
  inResponseTo: string;
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

  if (source.SAMLRequest.length > MAX_ENCODED_REQUEST_LENGTH) {
    throw new HttpException(413, 'Encoded SAMLRequest exceeds 1 MiB limit');
  }

  const inflated = await inflateRawAsync(Buffer.from(source.SAMLRequest, 'base64'), {
    maxOutputLength: MAX_INFLATED_REQUEST_BYTES,
  }).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_BUFFER_TOO_LARGE') {
      throw new HttpException(413, 'Inflated SAMLRequest exceeds 1 MiB limit');
    }
    throw error;
  });
  const xml = inflated.toString('utf8');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  if (!root) {
    throw new Error('Could not parse SAMLRequest XML');
  }

  return {
    protocol: 'saml',
    destination: root.getAttribute('AssertionConsumerServiceURL') || '',
    inResponseTo: root.getAttribute('ID') || '',
    relayState: source.RelayState,
  };
}
