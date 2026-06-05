import { createHash, randomBytes } from 'crypto';

/**
 * SAML element ID: an underscore-prefixed md5 hex of a seed (ported from the
 * original fake-sso-idp `createId`). The leading `_` keeps it a valid xsd:ID.
 */
export const createId = (seed: string): string => `_${createHash('md5').update(seed).digest('hex')}`;

/** Random 32-byte hex string used for the assertion's SessionIndex. */
export const createSessionId = (): string => randomBytes(32).toString('hex');

/**
 * PEM keys/certs are stored in env as single-line strings with literal `\n`.
 * passport-saml un-escapes these internally, but xml-crypto does not, so we
 * must turn the literal `\n` back into real newlines before handing it to the
 * signer (otherwise OpenSSL throws an opaque PEM-routines error).
 */
export const normalizePem = (pem: string): string => pem.replace(/\\n/g, '\n');

/** Strip PEM armor + whitespace, leaving the bare base64 body for <ds:X509Certificate>. */
export const pemCertBody = (cert: string): string =>
  normalizePem(cert)
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

/** Escape a value for safe inclusion in XML text/attribute content. */
export const xmlEscape = (value: string): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Escape a value for safe inclusion in HTML text/attribute content. */
export const htmlEscape = (value: string): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
