import { config } from 'dotenv';
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
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  SECRET_KEY,
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
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_DISPLAY_NAME,
  ADMIN_URL,
  OIDC_ISSUER: OIDC_ISSUER_ENV,
} = process.env;

// IdP role: canonical path where the IdP routes are mounted on this Express app.
export const IDP_MOUNT_PATH = `${BASE_URL_PREFIX}/saml/idp`;

// IdP role: optional public sub-path PREFIX, prepended to the mount path. Set it to
// serve the IdP under a sub-path, e.g. SAML_IDP_BASE_PATH=/idp2 exposes the IdP at
// `<host>/idp2/api/saml/idp/*`. Leading/trailing slashes are normalised; empty = no
// prefix (default).
export const IDP_PATH_PREFIX = process.env.SAML_IDP_BASE_PATH ? `/${process.env.SAML_IDP_BASE_PATH.replace(/^\/+|\/+$/g, '')}` : '';

// IdP role: the PUBLIC base path advertised in browser-facing URLs (login/logout
// form actions, metadata SSO Location) = prefix + mount path. The router is also
// mounted here (in addition to IDP_MOUNT_PATH), so the IdP is reachable at the
// sub-path whether the request hits the backend directly or via a reverse proxy.
export const IDP_PUBLIC_PATH = `${IDP_PATH_PREFIX}${IDP_MOUNT_PATH}`;

// Shared identity picker: login/authenticate/logout serve BOTH protocol roles
// (one test session), so their canonical home is a protocol-neutral path — an
// OIDC login that visibly routed through /api/saml/* read as "I was sent into
// the SAML flow". The SAML-era paths stay mounted as aliases.
export const IDP_SHARED_MOUNT_PATH = `${BASE_URL_PREFIX}/idp`;
export const IDP_SHARED_PUBLIC_PATH = `${IDP_PATH_PREFIX}${IDP_SHARED_MOUNT_PATH}`;

// SP role: the local test page, as a browser-facing path (used for cross-links).
export const SAML_TEST_PATH = `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/test`;

// OIDC role: canonical path where the OpenID Provider routes are mounted, and the
// PUBLIC base path advertised in discovery — same prefix scheme as the SAML IdP
// above, so a sub-path deployment configures both roles with one variable.
export const OIDC_MOUNT_PATH = `${BASE_URL_PREFIX}/oidc`;
export const OIDC_PUBLIC_PATH = `${IDP_PATH_PREFIX}${OIDC_MOUNT_PATH}`;

/**
 * OIDC role: the `iss` value. It must match discovery's `issuer` and the RP's own
 * configuration byte for byte, so it is derived from the same browser-facing
 * origin the SAML entityID already carries (the proxy origin in every documented
 * topology, including the external-proxy overlay). `OIDC_ISSUER` overrides it.
 */
export const OIDC_ISSUER = (() => {
  if (OIDC_ISSUER_ENV) {
    return OIDC_ISSUER_ENV.replace(/\/+$/, '');
  }
  try {
    return `${new URL(SAML_IDP_ENTITY_ID).origin}${OIDC_PUBLIC_PATH}`;
  } catch {
    return OIDC_PUBLIC_PATH;
  }
})();

/**
 * OIDC role: the absolute base URL the endpoints actually live at. Kept separate
 * from OIDC_ISSUER because `iss` is an identifier an operator may pin to anything,
 * while the endpoint URLs must keep resolving to this app's routes.
 */
export const OIDC_PUBLIC_URL = (() => {
  try {
    return `${new URL(OIDC_ISSUER).origin}${OIDC_PUBLIC_PATH}`;
  } catch {
    return OIDC_PUBLIC_PATH;
  }
})();

/**
 * OIDC role: the local test Relying Party (the OIDC counterpart of
 * `GET /api/saml/test`). Browser-facing, so anchored to the issuer origin — that
 * is the origin the browser reaches this stack on in every documented topology.
 */
export const OIDC_TEST_PATH = `${OIDC_PUBLIC_PATH}/test`;
export const OIDC_TEST_URL = `${OIDC_PUBLIC_URL}/test`;
export const OIDC_TEST_CALLBACK_URL = `${OIDC_TEST_URL}/callback`;

/**
 * OIDC role: base URL the local test RP uses for its BACK-CHANNEL calls (`/token`,
 * `/userinfo`, `/jwks.json`). Deliberately not the public URL: inside a container
 * the public host/port is the browser's view of the proxy, not something this
 * process can reach. Loopback on its own port always works, and the `iss` it
 * verifies is still the public issuer — exactly the split a real RP behind a proxy
 * has to make.
 */
export const OIDC_INTERNAL_URL = process.env.OIDC_INTERNAL_URL || `http://127.0.0.1:${PORT || 3000}${OIDC_MOUNT_PATH}`;

// OIDC role: token lifetimes, in seconds. Generous by default — this is a
// simulator and an expired token mid-demo is pure friction.
const seconds = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
export const OIDC_ID_TOKEN_TTL = seconds(process.env.OIDC_ID_TOKEN_TTL, 60 * 60);
export const OIDC_ACCESS_TOKEN_TTL = seconds(process.env.OIDC_ACCESS_TOKEN_TTL, 60 * 60);
/** Authorization codes are single-use and redeemed immediately; keep the window short. */
export const OIDC_CODE_TTL = seconds(process.env.OIDC_CODE_TTL, 120);
