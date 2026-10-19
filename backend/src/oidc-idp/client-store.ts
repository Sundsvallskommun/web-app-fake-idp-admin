import prisma from '@utils/prisma';
import { timingSafeEqual } from 'crypto';

/**
 * A registered Relying Party, with the JSON-encoded URI columns already parsed.
 * The SAML role has no equivalent: an AuthnRequest names its own
 * AssertionConsumerServiceURL, whereas OIDC has no signed request, so this
 * registry — specifically `redirectUris` — is the security boundary.
 */
export interface OidcClientRecord {
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  requirePkce: boolean;
  isPublic: boolean;
}

export interface OidcClientStore {
  /**
   * `browsingOrigin` is the origin the operator's browser used for this request.
   * Only the built-in local test client consults it (see local-client.ts) — a
   * database-registered client's redirect URIs are always exactly what was stored.
   */
  getClient(clientId: string, browsingOrigin?: string): Promise<OidcClientRecord | null>;
}

/** SQLite has no array column; a malformed value must not take the endpoint down. */
export const parseUriList = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

export const encodeUriList = (uris: string[]): string => JSON.stringify(uris);

export class PrismaOidcClientStore implements OidcClientStore {
  public async getClient(clientId: string): Promise<OidcClientRecord | null> {
    const client = await prisma.oidcClient.findUnique({ where: { clientId } });
    if (!client) {
      return null;
    }

    return {
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      name: client.name,
      redirectUris: parseUriList(client.redirectUris),
      postLogoutRedirectUris: parseUriList(client.postLogoutRedirectUris),
      requirePkce: client.requirePkce,
      isPublic: client.isPublic,
    };
  }
}

/**
 * Exact string match, as OIDC Core 3.1.2.1 requires. No normalisation, no prefix
 * matching, no wildcards: everything an RP could get wrong here is something an
 * attacker could get right.
 */
export const isRegisteredRedirectUri = (client: OidcClientRecord, redirectUri: string): boolean => client.redirectUris.includes(redirectUri);

export const isRegisteredPostLogoutRedirectUri = (client: OidcClientRecord, redirectUri: string): boolean =>
  client.postLogoutRedirectUris.includes(redirectUri);

/** Constant-time comparison so a wrong secret leaks nothing through response timing. */
export const secretMatches = (expected: string, provided: string): boolean => {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
};
