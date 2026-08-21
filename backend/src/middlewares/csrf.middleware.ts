import { BASE_URL_PREFIX, IDP_PATH_PREFIX } from '@config';
import { csrfSync } from 'csrf-sync';
import { Request } from 'express';

const externalSamlPostBindings = new Set([
  `${BASE_URL_PREFIX}/saml/idp/sso`,
  `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/idp/sso`,
  `${BASE_URL_PREFIX}/saml/login/callback`,
  `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/login/callback`,
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
  skipCsrfProtection: req => req.method === 'POST' && externalSamlPostBindings.has(req.path),
});

export const csrfProtection = csrfSynchronisedProtection;
export const generateCsrfToken = generateToken;
