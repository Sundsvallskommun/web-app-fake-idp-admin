import { SAML_IDP_PRIVATE_KEY, SAML_IDP_PUBLIC_CERT } from '@config';
import { normalizePem, pemCertBody } from '@utils/pem';
import { createHash, createPublicKey, X509Certificate } from 'crypto';

/**
 * The OIDC role signs with the SAME keypair as the SAML role — the stack ships
 * exactly one self-signed pair in `.env` (see docker-compose.yml). SAML signs XML
 * with SHA-1 for parity with the original fake-sso-idp; JWTs carry no such legacy
 * constraint, so tokens are RS256.
 */
export const SIGNING_ALGORITHM = 'RS256' as const;

export const base64url = (value: Buffer | string): string => (Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8')).toString('base64url');

interface DerivedKey {
  kid: string;
  jwk: Record<string, unknown>;
}

/** Lazily derived so unreadable key material fails on first use, not at import.
 *  Memoised for the process lifetime: a test that swaps @config must do so before
 *  the first call, not after. */
let cached: DerivedKey | undefined;

/**
 * RFC 7638 JWK thumbprint: SHA-256 over the canonical JSON of the required RSA
 * members, in lexicographic order. Used as the `kid` because it is derived from
 * the key itself — stable across restarts, and reproducible by any RP holding the
 * public key. (`SAML_IDP_PUBLIC_CERT` normally holds a certificate; the
 * thumbprint works either way, whereas an x5t would not.)
 */
const jwkThumbprint = (jwk: Record<string, unknown>): string =>
  base64url(
    createHash('sha256')
      .update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n }))
      .digest(),
  );

const derive = (): DerivedKey => {
  if (cached) {
    return cached;
  }

  const pem = normalizePem(SAML_IDP_PUBLIC_CERT);
  const publicJwk = createPublicKey(pem).export({ format: 'jwk' }) as Record<string, unknown>;
  const kid = jwkThumbprint(publicJwk);

  // The certificate chain is advertised when there IS one, so an RP can pin the
  // same cert it already trusts on the SAML side. A bare public key is still valid
  // key material for JWS, it just has no x5c to publish.
  let certificate: { x5c: string[]; 'x5t#S256': string } | undefined;
  try {
    certificate = {
      x5c: [pemCertBody(SAML_IDP_PUBLIC_CERT)],
      'x5t#S256': base64url(createHash('sha256').update(new X509Certificate(pem).raw).digest()),
    };
  } catch {
    certificate = undefined;
  }

  cached = {
    kid,
    jwk: { ...publicJwk, use: 'sig', alg: SIGNING_ALGORITHM, kid, ...certificate },
  };
  return cached;
};

export const signingKid = (): string => derive().kid;

/** The private key in a form OpenSSL accepts (env stores it with literal `\n`). */
export const signingKey = (): string => normalizePem(SAML_IDP_PRIVATE_KEY);

/** The public key used to verify tokens this OP issued (e.g. at `/userinfo`). */
export const verificationKey = (): string => normalizePem(SAML_IDP_PUBLIC_CERT);

/** The JWKS document served at the `jwks_uri` advertised in discovery. */
export const buildJwks = (): { keys: Record<string, unknown>[] } => ({ keys: [derive().jwk] });
