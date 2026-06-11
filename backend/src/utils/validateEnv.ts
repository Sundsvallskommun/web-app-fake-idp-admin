import { cleanEnv, port, str, url } from 'envalid';

// NOTE: Make sure we got these in ENV
const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    SECRET_KEY: str(),
    API_BASE_URL: str(),
    CLIENT_KEY: str(),
    CLIENT_SECRET: str(),
    PORT: port(),
    BASE_URL_PREFIX: str(),
    SAML_CALLBACK_URL: url(),
    SAML_LOGOUT_CALLBACK_URL: url(),
    SAML_FAILURE_REDIRECT: url(),
    SAML_ENTRY_SSO: url(),
    SAML_ISSUER: str(),
    SAML_IDP_PUBLIC_CERT: str(),
    SAML_PRIVATE_KEY: str(),
    SAML_PUBLIC_KEY: str(),
    // IdP role (this backend acting as a fake SAML Identity Provider).
    SAML_IDP_PRIVATE_KEY: str(),
    SAML_IDP_ENTITY_ID: str(),
    SAML_SP_AUDIENCE: str({ default: '' }),
    // Optional public sub-path for the IdP's browser-facing URLs (reverse-proxy setups).
    SAML_IDP_BASE_PATH: str({ default: '' }),
  });
};

export default validateEnv;
