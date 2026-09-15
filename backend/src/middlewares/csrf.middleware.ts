import { BASE_URL_PREFIX, IDP_PATH_PREFIX, OIDC_MOUNT_PATH, OIDC_PUBLIC_PATH } from '@config';
import { csrfSync } from 'csrf-sync';
import { Request } from 'express';

/**
 * POSTs that cannot carry a synchronizer token, and do not need one.
 *
 * SAML: the HTTP-POST bindings are cross-site by protocol and are protected by
 * signed assertions plus InResponseTo instead.
 *
 * OIDC: `/token` and `/userinfo` are called by the RP's *server*, not a browser —
 * no cookie is involved, so there is no session to ride on. They authenticate with
 * client credentials and a bearer token respectively. `/authorize` is a GET and is
 * covered by the exact-match redirect_uri check rather than a token.
 */
const unprotectedPostBindings = new Set([
  `${BASE_URL_PREFIX}/saml/idp/sso`,
  `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/idp/sso`,
  `${BASE_URL_PREFIX}/saml/login/callback`,
  `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/login/callback`,
  `${OIDC_MOUNT_PATH}/token`,
  `${OIDC_PUBLIC_PATH}/token`,
  `${OIDC_MOUNT_PATH}/userinfo`,
  `${OIDC_PUBLIC_PATH}/userinfo`,
]);

const requestToken = (req: Request): string | undefined => {
  if (req.is('application/x-www-form-urlencoded')) {
    return typeof req.body?._csrf === 'string' ? req.body._csrf : undefined;
  }

  const token = req.headers['x-csrf-token'];
  return typeof token === 'string' ? token : undefined;
};

const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: requestToken,
  skipCsrfProtection: req => req.method === 'POST' && unprotectedPostBindings.has(req.path),
});

export const csrfProtection = csrfSynchronisedProtection;
export const generateCsrfToken = generateToken;
