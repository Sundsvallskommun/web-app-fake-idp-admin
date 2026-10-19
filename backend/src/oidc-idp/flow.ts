import type { Request, Response } from 'express';
import { AuthorizationCodeStore } from './code-store';
import type { PendingOidcRequest } from './pending';

/**
 * One OP per process, so one code store. Exported rather than injected because
 * `/authorize`, the shared `/authenticate` handler and `/token` all have to agree
 * on the same map; unit tests construct their own `AuthorizationCodeStore`.
 */
export const authorizationCodes = new AuthorizationCodeStore();

/** Build an authorization response URL, preserving any query the RP already put on its callback. */
const responseUrl = (redirectUri: string, params: Record<string, string | undefined>): string => {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
};

/**
 * Redirect an error back to the RP. Only ever called once the client and its
 * redirect URI have been validated — an unregistered callback must be reported on
 * screen instead, never redirected to (OIDC Core 3.1.2.6).
 */
export const redirectAuthorizationError = (res: Response, redirectUri: string, error: string, description: string, state?: string): void => {
  res.redirect(303, responseUrl(redirectUri, { error, error_description: description, state }));
};

/**
 * Finish a parked OIDC authorization for `userId`: mint a single-use code and send
 * the browser back to the RP. Called from `/authorize` when a test identity is
 * already selected, and from the shared `/authenticate` handler when one has just
 * been picked — the two entry points the SAML role has for `respondWithAssertion`.
 */
export function completeAuthorization(req: Request, res: Response, pending: PendingOidcRequest, userId: string): void {
  const code = authorizationCodes.issue({
    clientId: pending.clientId,
    userId,
    redirectUri: pending.redirectUri,
    scope: pending.scope,
    nonce: pending.nonce,
    codeChallenge: pending.codeChallenge,
    codeChallengeMethod: pending.codeChallengeMethod,
    authTime: req.session.idpAuthTime ?? Math.floor(Date.now() / 1000),
  });

  res.redirect(303, responseUrl(pending.redirectUri, { code, state: pending.state }));
}
