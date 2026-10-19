/**
 * An authorization request parked in the session while the operator picks a test
 * identity. Both protocols share one session and one login page, so the pending
 * request is a tagged union rather than two fields — with two fields, a login
 * started from one protocol and finished after the other had also parked a
 * request would have no defined winner.
 */
export interface PendingOidcRequest {
  protocol: 'oidc';
  clientId: string;
  /** Shown on the login page as "Fortsätt till …", so the operator sees who is asking. */
  clientName: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}
