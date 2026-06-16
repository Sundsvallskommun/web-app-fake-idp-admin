import { config } from 'dotenv';
import { APIS } from './api-config';

export { APIS };

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED === 'true';
export const SESSION_MEMORY = process.env.SESSION_MEMORY === 'true';
// IdP role: show a user dropdown on the login page unless explicitly disabled.
export const SAML_IDP_ENUMERATE_USERS = process.env.SAML_IDP_ENUMERATE_USERS !== 'false';

export const {
  APP_NAME,
  NODE_ENV,
  PORT,
  API_BASE_URL,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  SECRET_KEY,
  CLIENT_KEY,
  CLIENT_SECRET,
  BASE_URL_PREFIX,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_SUCCESS_BASE,
  SAML_SUCCESS_REDIRECT,
  SAML_FAILURE_REDIRECT,
  SAML_FAILURE_REDIRECT_MESSAGE,
  SAML_LOGOUT_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_AUDIENCE,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SAML_IDP_PRIVATE_KEY,
  SAML_IDP_ENTITY_ID,
  SAML_SP_AUDIENCE,
  // Optional comma-separated allow-list of group names. When set, only users whose
  // SAML `groups` claim contains one of these may sign in to the admin app. Empty/
  // unset = no gating (any authenticated user is allowed).
  ADMIN_PANEL_GROUP,
} = process.env;

// IdP role: canonical path where the IdP routes are mounted on this Express app.
export const IDP_MOUNT_PATH = `${BASE_URL_PREFIX}/saml/idp`;

// IdP role: optional public sub-path PREFIX, prepended to the mount path. Set it to
// serve the IdP under a sub-path, e.g. SAML_IDP_BASE_PATH=/idp2 exposes the IdP at
// `<host>/idp2/api/saml/idp/*`. Leading/trailing slashes are normalised; empty = no
// prefix (default).
export const IDP_PATH_PREFIX = process.env.SAML_IDP_BASE_PATH
  ? `/${process.env.SAML_IDP_BASE_PATH.replace(/^\/+|\/+$/g, '')}`
  : '';

// IdP role: the PUBLIC base path advertised in browser-facing URLs (login/logout
// form actions, metadata SSO Location) = prefix + mount path. The router is also
// mounted here (in addition to IDP_MOUNT_PATH), so the IdP is reachable at the
// sub-path whether the request hits the backend directly or via a reverse proxy.
export const IDP_PUBLIC_PATH = `${IDP_PATH_PREFIX}${IDP_MOUNT_PATH}`;
