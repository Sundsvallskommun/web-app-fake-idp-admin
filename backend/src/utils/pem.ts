/**
 * PEM handling shared by both issuing roles: the SAML IdP signs XML with
 * xml-crypto, the OIDC OP signs JWTs with jsonwebtoken, and both read the same
 * keypair out of the environment.
 */

/**
 * PEM keys/certs are stored in env as single-line strings with literal `\n`.
 * passport-saml un-escapes these internally, but xml-crypto and jsonwebtoken do
 * not, so we must turn the literal `\n` back into real newlines before handing
 * the key to a signer (otherwise OpenSSL throws an opaque PEM-routines error).
 */
export const normalizePem = (pem: string): string => pem.replace(/\\n/g, '\n');

/** Strip PEM armor + whitespace, leaving the bare base64 body (`<ds:X509Certificate>`, JWK `x5c`). */
export const pemCertBody = (cert: string): string =>
  normalizePem(cert)
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
