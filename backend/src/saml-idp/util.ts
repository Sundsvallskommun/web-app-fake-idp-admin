import { createHash, randomBytes } from 'crypto';

/**
 * SAML element ID: an underscore-prefixed SHA-256 hex of a seed. The leading
 * `_` keeps it a valid xsd:ID.
 */
export const createId = (seed: string): string => `_${createHash('sha256').update(seed).digest('hex')}`;

/** Random 32-byte hex string used for the assertion's SessionIndex. */
export const createSessionId = (): string => randomBytes(32).toString('hex');

// PEM handling moved to @utils/pem when the OIDC role started signing with the
// same keypair. Re-exported so SAML call sites keep their existing import.
export { normalizePem, pemCertBody } from '@utils/pem';

/** Escape a value for safe inclusion in XML text/attribute content. */
export const xmlEscape = (value: string): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Escape a value for safe inclusion in HTML text/attribute content. */
export const htmlEscape = (value: string): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
