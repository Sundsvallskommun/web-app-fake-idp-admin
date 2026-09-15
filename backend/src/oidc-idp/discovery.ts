import { OIDC_ISSUER, OIDC_PUBLIC_URL } from '@config';
import { GROUPS_CLAIM, SUPPORTED_SCOPES } from './claims';
import { SIGNING_ALGORITHM } from './keys';

export const DISCOVERY_PATH = '/.well-known/openid-configuration';

/**
 * The OpenID Provider metadata document. It advertises only what this OP actually
 * implements: authorization code (with PKCE) and nothing else. Implicit, hybrid,
 * refresh tokens, dynamic registration, request objects and revocation are all
 * deliberately absent — a conformant RP reads this document and will not try them.
 */
export function buildDiscoveryDocument(): Record<string, unknown> {
  return {
    issuer: OIDC_ISSUER,
    authorization_endpoint: `${OIDC_PUBLIC_URL}/authorize`,
    token_endpoint: `${OIDC_PUBLIC_URL}/token`,
    userinfo_endpoint: `${OIDC_PUBLIC_URL}/userinfo`,
    jwks_uri: `${OIDC_PUBLIC_URL}/jwks.json`,
    introspection_endpoint: `${OIDC_PUBLIC_URL}/introspect`,
    introspection_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    end_session_endpoint: `${OIDC_PUBLIC_URL}/end-session`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: [SIGNING_ALGORITHM],
    // `none` covers public clients, which authenticate with PKCE alone.
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256', 'plain'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'auth_time',
      'nonce',
      'azp',
      'at_hash',
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'email',
      'email_verified',
      // Mirrors the SAML assertion's groups attribute, as a JSON array.
      GROUPS_CLAIM,
    ],
    claims_parameter_supported: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: false,
  };
}
