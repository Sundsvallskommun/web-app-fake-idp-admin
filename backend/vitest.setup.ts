import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

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
process.env.SAML_ISSUER = 'contract-sp';
process.env.SAML_SP_AUDIENCE = 'contract-sp';
process.env.SWAGGER_ENABLED = 'false';
