import { createHash, timingSafeEqual } from 'crypto';
import { base64url } from './keys';

export type CodeChallengeMethod = 'S256' | 'plain';

export const isCodeChallengeMethod = (value: unknown): value is CodeChallengeMethod => value === 'S256' || value === 'plain';

const equals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

/**
 * RFC 7636 §4.6. `plain` is accepted because some older test RPs still send it,
 * but it is never the default: a client that omits `code_challenge_method`
 * declares `plain` explicitly per the RFC, and clients registered with
 * `requirePkce` must supply a challenge at all.
 */
export function verifyCodeChallenge(challenge: string, method: CodeChallengeMethod, verifier: string): boolean {
  if (method === 'plain') {
    return equals(challenge, verifier);
  }
  return equals(challenge, base64url(createHash('sha256').update(verifier, 'ascii').digest()));
}
