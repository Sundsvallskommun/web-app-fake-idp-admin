import { createHash } from 'crypto';
import { base64url } from './keys';
import { isCodeChallengeMethod, verifyCodeChallenge } from './pkce';

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const S256_CHALLENGE = base64url(createHash('sha256').update(VERIFIER, 'ascii').digest());

describe('verifyCodeChallenge', () => {
  it('accepts a matching S256 verifier', () => {
    expect(verifyCodeChallenge(S256_CHALLENGE, 'S256', VERIFIER)).toBe(true);
  });

  it('rejects a verifier that does not hash to the challenge', () => {
    expect(verifyCodeChallenge(S256_CHALLENGE, 'S256', 'a-different-verifier')).toBe(false);
  });

  it('never treats the raw verifier as an S256 challenge', () => {
    expect(verifyCodeChallenge(VERIFIER, 'S256', VERIFIER)).toBe(false);
  });

  it('compares plain challenges literally', () => {
    expect(verifyCodeChallenge(VERIFIER, 'plain', VERIFIER)).toBe(true);
    expect(verifyCodeChallenge(VERIFIER, 'plain', `${VERIFIER}x`)).toBe(false);
  });
});

describe('isCodeChallengeMethod', () => {
  it('accepts only the two methods discovery advertises', () => {
    expect(isCodeChallengeMethod('S256')).toBe(true);
    expect(isCodeChallengeMethod('plain')).toBe(true);
    expect(isCodeChallengeMethod('s256')).toBe(false);
    expect(isCodeChallengeMethod(undefined)).toBe(false);
  });
});
