import { OIDC_ACCESS_TOKEN_TTL, OIDC_ISSUER } from '@config';
import { createHash, generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { base64url, buildJwks, signingKid } from './keys';
import { accessTokenHash, bearerToken, createAccessToken, createIdToken, verifyAccessToken } from './tokens';

// No @config mock: vitest.setup.ts already puts a generated keypair and a
// SAML_IDP_ENTITY_ID in the environment, so the real config derives a real issuer.

const decode = (token: string): jwt.Jwt => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('not a decodable JWT');
  }
  return decoded;
};

const payloadOf = (token: string): jwt.JwtPayload => {
  const { payload } = decode(token);
  if (typeof payload === 'string') {
    throw new Error('expected a JSON payload');
  }
  return payload;
};

describe('access tokens', () => {
  it('round-trips through verification with its grant intact', () => {
    const { token } = createAccessToken({ sub: 'user-1', clientId: 'test-client', scope: ['openid', 'profile'] });
    const payload = verifyAccessToken(token);

    expect(payload).toMatchObject({
      sub: 'user-1',
      client_id: 'test-client',
      aud: 'test-client',
      scope: 'openid profile',
      iss: OIDC_ISSUER,
    });
  });

  it('is signed with the key JWKS advertises', () => {
    const { token } = createAccessToken({ sub: 'user-1', clientId: 'test-client', scope: ['openid'] });

    expect(decode(token).header).toMatchObject({ alg: 'RS256', kid: signingKid(), typ: 'at+jwt' });
    expect(buildJwks().keys[0].kid).toBe(signingKid());
  });

  it('expires after the configured lifetime', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const { token, expiresIn } = createAccessToken({ sub: 'user-1', clientId: 'test-client', scope: ['openid'] });
      expect(expiresIn).toBe(OIDC_ACCESS_TOKEN_TTL);
      expect(verifyAccessToken(token)).not.toBeNull();

      vi.setSystemTime(new Date(Date.now() + (OIDC_ACCESS_TOKEN_TTL + 60) * 1000));
      expect(verifyAccessToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a token signed by someone else', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign(
      { sub: 'user-1', client_id: 'test-client', scope: 'openid' },
      privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
      {
        algorithm: 'RS256',
        issuer: OIDC_ISSUER,
        expiresIn: 600,
      },
    );

    expect(verifyAccessToken(forged)).toBeNull();
  });

  it('rejects a token issued for a different issuer', () => {
    const foreign = jwt.sign({ sub: 'user-1', client_id: 'test-client', scope: 'openid' }, 'not-a-key', { expiresIn: 600 });

    expect(verifyAccessToken(foreign)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const { token } = createAccessToken({ sub: 'user-1', clientId: 'test-client', scope: ['openid'] });
    const [header, , signature] = token.split('.');
    const swapped = base64url(JSON.stringify({ sub: 'someone-else', client_id: 'test-client', scope: 'openid' }));

    expect(verifyAccessToken(`${header}.${swapped}.${signature}`)).toBeNull();
  });
});

describe('ID tokens', () => {
  it('carries the claims, the audience and the RP-supplied nonce', () => {
    const idToken = createIdToken({
      claims: { sub: 'user-1', name: 'Test Person', groups: ['developers'] },
      clientId: 'test-client',
      nonce: 'nonce-1',
      authTime: 1_700_000_000,
    });

    expect(payloadOf(idToken)).toMatchObject({
      iss: OIDC_ISSUER,
      sub: 'user-1',
      aud: 'test-client',
      azp: 'test-client',
      name: 'Test Person',
      groups: ['developers'],
      nonce: 'nonce-1',
      auth_time: 1_700_000_000,
    });
  });

  it('binds the access token with at_hash', () => {
    const { token: accessToken } = createAccessToken({ sub: 'user-1', clientId: 'test-client', scope: ['openid'] });
    const idToken = createIdToken({ claims: { sub: 'user-1' }, clientId: 'test-client', authTime: 1, accessToken });

    // OIDC Core 3.1.3.6: base64url of the left-most half of the SHA-256.
    const digest = createHash('sha256').update(accessToken, 'ascii').digest();
    expect(payloadOf(idToken).at_hash).toBe(base64url(digest.subarray(0, 16)));
    expect(accessTokenHash(accessToken)).toBe(payloadOf(idToken).at_hash);
  });

  it('omits nonce and at_hash when the RP supplied neither', () => {
    const payload = payloadOf(createIdToken({ claims: { sub: 'user-1' }, clientId: 'test-client', authTime: 1 }));

    expect(payload.nonce).toBeUndefined();
    expect(payload.at_hash).toBeUndefined();
  });
});

describe('bearerToken', () => {
  it('reads the Authorization header regardless of scheme casing', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('bearer abc')).toBe('abc');
  });

  it('falls back to a form field when there is no header', () => {
    expect(bearerToken(undefined, 'abc')).toBe('abc');
    expect(bearerToken('Basic abc', 'form-token')).toBe('form-token');
  });

  it('returns undefined when neither is present', () => {
    expect(bearerToken(undefined)).toBeUndefined();
    expect(bearerToken('Bearer ')).toBeUndefined();
    expect(bearerToken(undefined, 42)).toBeUndefined();
  });
});
