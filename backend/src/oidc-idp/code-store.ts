import { OIDC_CODE_TTL } from '@config';
import { randomBytes } from 'crypto';

/**
 * The only server-side state the OIDC role keeps. Authorization codes live for
 * seconds between the browser redirect and the RP's back-channel exchange, so an
 * in-memory map is enough: the stack runs a single backend replica, and a restart
 * mid-flow simply makes the RP start over. Tokens deliberately carry their own
 * state (see tokens.ts) so nothing longer-lived needs a store.
 */
export interface AuthorizationCode {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string[];
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  /** Seconds since epoch, echoed into the ID token's `auth_time`. */
  authTime: number;
}

type StoredCode = AuthorizationCode & { expiresAt: number };

export class AuthorizationCodeStore {
  private readonly codes = new Map<string, StoredCode>();

  public constructor(private readonly ttlSeconds: number = OIDC_CODE_TTL) {}

  /** Drop expired entries. Called on write, so the map cannot grow without bound
   *  and no interval timer is needed to keep the process's event loop honest. */
  private sweep(now: number): void {
    for (const [code, stored] of this.codes) {
      if (stored.expiresAt <= now) {
        this.codes.delete(code);
      }
    }
  }

  public issue(grant: AuthorizationCode, now: number = Date.now()): string {
    this.sweep(now);
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { ...grant, expiresAt: now + this.ttlSeconds * 1000 });
    return code;
  }

  /** Single use: a redeemed or expired code is removed and never honoured twice. */
  public consume(code: string, now: number = Date.now()): AuthorizationCode | null {
    const stored = this.codes.get(code);
    if (!stored) {
      return null;
    }
    this.codes.delete(code);
    if (stored.expiresAt <= now) {
      return null;
    }
    // Rebuilt field by field rather than destructured: the expiry is internal
    // bookkeeping and must not travel out with the grant.
    return {
      clientId: stored.clientId,
      userId: stored.userId,
      redirectUri: stored.redirectUri,
      scope: stored.scope,
      nonce: stored.nonce,
      codeChallenge: stored.codeChallenge,
      codeChallengeMethod: stored.codeChallengeMethod,
      authTime: stored.authTime,
    };
  }

  public get size(): number {
    return this.codes.size;
  }
}
