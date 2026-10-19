import { OIDC_ACCESS_TOKEN_TTL, OIDC_ID_TOKEN_TTL, OIDC_ISSUER } from '@config';
import { createHash, randomBytes } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Claims } from './claims';
import { base64url, SIGNING_ALGORITHM, signingKey, signingKid, verificationKey } from './keys';

/**
 * Access tokens are JWTs rather than opaque handles on purpose: `/userinfo` can
 * then validate one by signature alone, which keeps the OP storeless apart from
 * the short-lived authorization codes. The trade-off is that an issued token
 * cannot be revoked before it expires — acceptable for a simulator, and the
 * reason there is no revocation endpoint.
 */
const ACCESS_TOKEN_TYPE = 'at+jwt';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  client_id: string;
  scope: string;
  // jsonwebtoken ships no type declarations, so JwtPayload contributes nothing —
  // the registered claims introspection echoes back are declared explicitly.
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

/** `at_hash`: base64url of the left-most half of the SHA-256 of the access token (OIDC Core 3.1.3.6). */
export const accessTokenHash = (accessToken: string): string => {
  const digest = createHash('sha256').update(accessToken, 'ascii').digest();
  return base64url(digest.subarray(0, digest.length / 2));
};

// `alg` and `kid` come from `algorithm`/`keyid`; only `typ` needs overriding.
const sign = (payload: Record<string, unknown>, expiresInSeconds: number, type?: string): string =>
  jwt.sign(payload, signingKey(), {
    algorithm: SIGNING_ALGORITHM,
    keyid: signingKid(),
    issuer: OIDC_ISSUER,
    expiresIn: expiresInSeconds,
    jwtid: randomBytes(16).toString('hex'),
    ...(type ? { header: { alg: SIGNING_ALGORITHM, typ: type } } : {}),
  });

export function createAccessToken(opts: { sub: string; clientId: string; scope: string[] }): { token: string; expiresIn: number } {
  const token = sign(
    {
      sub: opts.sub,
      // The RP is both the authorized party and, for this OP, the only audience
      // that ever presents the token back to `/userinfo`.
      aud: opts.clientId,
      client_id: opts.clientId,
      scope: opts.scope.join(' '),
    },
    OIDC_ACCESS_TOKEN_TTL,
    ACCESS_TOKEN_TYPE,
  );
  return { token, expiresIn: OIDC_ACCESS_TOKEN_TTL };
}

export function createIdToken(opts: { claims: Claims; clientId: string; nonce?: string; authTime: number; accessToken?: string }): string {
  return sign(
    {
      ...opts.claims,
      aud: opts.clientId,
      azp: opts.clientId,
      auth_time: opts.authTime,
      ...(opts.nonce ? { nonce: opts.nonce } : {}),
      ...(opts.accessToken ? { at_hash: accessTokenHash(opts.accessToken) } : {}),
    },
    OIDC_ID_TOKEN_TTL,
  );
}

/** Returns the payload of a token this OP issued, or null if it is absent, foreign, expired or tampered with. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, verificationKey(), {
      algorithms: [SIGNING_ALGORITHM],
      issuer: OIDC_ISSUER,
    });
    if (typeof payload === 'string') {
      return null;
    }
    const candidate = payload as AccessTokenPayload;
    // An ID token verifies against the same key, so the access-token-only members
    // are what separate the two. Callers read `scope` unguarded.
    if (typeof candidate.sub !== 'string' || typeof candidate.client_id !== 'string' || typeof candidate.scope !== 'string') {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/** Extract a bearer token from the Authorization header or an `access_token` form/query field. */
export function bearerToken(header: string | undefined, fallback?: unknown): string | undefined {
  const match = /^Bearer (.+)$/i.exec(header ?? '');
  if (match) {
    return match[1].trim();
  }
  return typeof fallback === 'string' && fallback ? fallback : undefined;
}
