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
  // IdP role: this backend acting as a fake SAML Identity Provider.
  SAML_IDP_PRIVATE_KEY,
  SAML_IDP_ENTITY_ID,
  SAML_SP_AUDIENCE,
} = process.env;
