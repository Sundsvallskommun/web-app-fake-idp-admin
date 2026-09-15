import { User } from '@/interfaces/users.interface';
import { PendingOidcRequest } from '@/oidc-idp/pending';
import { ParsedAuthnRequest } from '@/saml-idp/request-parser';
interface Engagement {
  organizationName: string;
  organizationNumber: string;
  organizationId: string;
}

declare module 'express-session' {
  interface Session {
    returnTo?: string;
    user?: User;
    representing?: Engagement;
    passport?: any;
    representingChoices?: Engagement[];
    messages: string[];
    adminUser?: { name: string; username: string; defaultCredentials?: boolean };
    // IdP role: the selected test identity, shared by the SAML and OIDC roles.
    idpIdentityId?: string;
    // Seconds since epoch when that identity was picked — the OIDC `auth_time` claim.
    idpAuthTime?: number;
    /**
     * The authorization request parked while the operator picks an identity. One
     * field, tagged by protocol: both roles share this session and the login page,
     * so two parallel fields would leave "which one does /authenticate finish?"
     * undefined whenever both were set.
     */
    idpRequest?: ParsedAuthnRequest | PendingOidcRequest;
    /**
     * Local OIDC test CLIENT state — the RP half, deliberately separate from the
     * provider half above. `state` and `nonce` tie the response to this browser;
     * `verifier` is the PKCE secret that never leaves the server.
     */
    oidcTest?: { state: string; nonce: string; verifier: string };
    /** What the local test client last received, rendered by GET /api/oidc/test. */
    oidcTestResult?: {
      scope: string;
      idTokenClaims: Record<string, unknown>;
      userinfoClaims: Record<string, unknown>;
    };
  }
}
