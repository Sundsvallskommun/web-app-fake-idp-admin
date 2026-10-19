/// <reference types="vitest/globals" />
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env.NODE_ENV = 'test';
process.env.BASE_URL_PREFIX = '/api';
process.env.CREDENTIALS = 'true';
process.env.LOG_DIR = '../../data/logs';
process.env.LOG_FORMAT = 'dev';
process.env.ORIGIN = 'http://localhost:3000';
process.env.PORT = '3001';
process.env.SECRET_KEY = 'vitest-only-session-secret';
process.env.SESSION_MEMORY = 'true';
process.env.SAML_IDP_ENTITY_ID = 'https://fake-idp.test/api/saml/idp/metadata';
process.env.SAML_IDP_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
// The OIDC role reads the same pair to build its JWKS and to verify its own
// access tokens. A bare SPKI public key is enough here — the `kid` is an RFC 7638
// thumbprint, so only the deployed cert adds an `x5c`, never the key identity.
process.env.SAML_IDP_PUBLIC_CERT = publicKey.export({ format: 'pem', type: 'spki' }).toString();
// Rendered into the IdP pages' navigation links.
process.env.ADMIN_URL = 'https://fake-idp.test/start';
process.env.SAML_ISSUER = 'contract-sp';
process.env.SAML_SP_AUDIENCE = 'contract-sp';
process.env.SWAGGER_ENABLED = 'false';
