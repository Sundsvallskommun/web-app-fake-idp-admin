import { OIDC_MOUNT_PATH, OIDC_PUBLIC_PATH, OIDC_PUBLIC_URL } from '@config';
import type { OidcClientRecord, OidcClientStore } from './client-store';

/**
 * The backend's own test Relying Party. The SAML role needs no equivalent — its
 * local SP is a passport strategy that simply trusts the IdP — but OIDC refuses
 * unregistered clients by design, so the test page has to BE a registered client.
 * Built in rather than seeded so the loop works on a freshly created database,
 * which is what Docker gives you (compose never seeds).
 */
export const LOCAL_TEST_CLIENT_ID = 'fake-idp-local-test';

const TEST_PATH_SUFFIX = '/test';

/** Both mounts: the app answers on the public (prefixed) path and the bare one. */
const testPaths = (): string[] => [...new Set([OIDC_PUBLIC_PATH, OIDC_MOUNT_PATH])].map(path => `${path}${TEST_PATH_SUFFIX}`);

const issuerOrigin = (): string => {
  try {
    return new URL(OIDC_PUBLIC_URL).origin;
  } catch {
    return '';
  }
};

/**
 * Whether a browsing origin may be used to build this client's redirect URI.
 *
 * Any http(s) origin is accepted, because an operator reaches this stack under
 * whatever names their hosts file gives it — `idp.test`, `dev.test`, `localhost`,
 * a container IP — often several for the same backend, and on the proxy port or
 * the backend's own. Restricting this to the issuer's hostname looked prudent but
 * only broke the test page on every other name.
 *
 * It does not open a redirect. The URI is not attacker-supplied: it is built by
 * the server from the request's own `Host` plus this app's fixed callback path, so
 * the target is always this application. For a browser to arrive with some host,
 * that host must already resolve here — which means the redirect back to it lands
 * here too. And the code is PKCE-bound to a verifier held server-side in the
 * caller's own session, so a code that did escape could not be redeemed.
 *
 * This applies to the built-in test client ONLY. Database-registered clients keep
 * strict exact-match against their stored URIs (see isRegisteredRedirectUri).
 */
export const isAcceptableBrowsingOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return false;
  }
  try {
    const { protocol, hostname } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:') && hostname !== '';
  } catch {
    return false;
  }
};

/**
 * Public + PKCE-only: the RP runs in this same process, so a shared secret would
 * protect nothing and would be one more value to keep in sync with the environment.
 */
export const localTestClient = (browsingOrigin?: string): OidcClientRecord => {
  const origins = [issuerOrigin(), ...(isAcceptableBrowsingOrigin(browsingOrigin) ? [browsingOrigin as string] : [])].filter(Boolean);
  const bases = [...new Set(origins.flatMap(origin => testPaths().map(path => `${origin}${path}`)))];

  return {
    clientId: LOCAL_TEST_CLIENT_ID,
    clientSecret: '',
    name: 'Lokal testapplikation',
    redirectUris: bases.map(base => `${base}/callback`),
    postLogoutRedirectUris: bases,
    requirePkce: true,
    isPublic: true,
  };
};

/**
 * Resolves the built-in test client before consulting the database, so an
 * administrator cannot shadow (or accidentally break) the local loop by creating a
 * row with the same `clientId`.
 */
export class LocalFirstClientStore implements OidcClientStore {
  public constructor(private readonly delegate: OidcClientStore) {}

  public async getClient(clientId: string, browsingOrigin?: string): Promise<OidcClientRecord | null> {
    if (clientId === LOCAL_TEST_CLIENT_ID) {
      return localTestClient(browsingOrigin);
    }
    return this.delegate.getClient(clientId);
  }
}
