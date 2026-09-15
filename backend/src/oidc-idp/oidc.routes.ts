import { IDP_SHARED_PUBLIC_PATH, OIDC_MOUNT_PATH, OIDC_PUBLIC_PATH, OIDC_PUBLIC_URL } from '@config';
import { UsersService } from '@services/users.service';
import { logger } from '@utils/logger';
import { isValidUrl } from '@utils/util';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ClaimsSubject, claimsForUser, filterClaimsByScope, SUPPORTED_SCOPES } from './claims';
import {
  isRegisteredPostLogoutRedirectUri,
  isRegisteredRedirectUri,
  OidcClientRecord,
  OidcClientStore,
  PrismaOidcClientStore,
  secretMatches,
} from './client-store';
import { buildDiscoveryDocument, DISCOVERY_PATH } from './discovery';
import { LocalFirstClientStore } from './local-client';
import { authorizationCodes, completeAuthorization, redirectAuthorizationError } from './flow';
import { buildJwks } from './keys';
import type { PendingOidcRequest } from './pending';
import { CodeChallengeMethod, isCodeChallengeMethod, verifyCodeChallenge } from './pkce';
import { bearerToken, createAccessToken, createIdToken, verifyAccessToken } from './tokens';

/** The identity picker is shared with the SAML role — there is one test session. */
const LOGIN_URL = `${IDP_SHARED_PUBLIC_PATH}/login`;

/**
 * The user lookup the OP needs. Narrower than the SAML role's store: OIDC never
 * enumerates or password-checks here, because both happen on the shared login page.
 */
export interface OidcUserStore {
  getUser(id: string): Promise<ClaimsSubject | null>;
}

const oidcRateLimit = rateLimit({
  windowMs: 60 * 1000,
  // Higher than the SAML router's: one login drives several endpoints here, and an
  // RP's back-channel /token and /userinfo calls all share the backend's own IP.
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

/**
 * The endpoints a browser-based RP fetches cross-origin. `/authorize` and
 * `/end-session` are excluded: they are top-level navigations, not fetches.
 */
const CORS_PATHS = new Set([DISCOVERY_PATH, '/jwks.json', '/token', '/userinfo']);

/**
 * Real CORS headers, rather than the SAML routes' blanket bypass. `*` is safe and
 * conventional here: none of these endpoints authenticate with cookies — the token
 * endpoint uses client credentials, /userinfo a bearer token. Mounted as router
 * middleware rather than per route so the OPTIONS preflight is answered too: a
 * form-encoded POST is CORS-simple, but `Authorization: Basic` provokes a preflight,
 * which would never reach a route registered only for POST.
 */
function oidcCors(req: Request, res: Response, next: NextFunction): void {
  if (!CORS_PATHS.has(req.path)) {
    next();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

const saveSession = (req: Request): Promise<void> => new Promise((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));

/**
 * The origin the browser actually used. `trust proxy` is on, so this follows
 * X-Forwarded-Proto/Host through the bundled nginx.
 */
const browsingOrigin = (req: Request): string => `${req.protocol}://${req.get('host')}`;

const param = (source: Record<string, unknown>, name: string): string | undefined => {
  const value = source[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/** OAuth error body (RFC 6749 §5.2). */
const tokenError = (res: Response, status: number, error: string, description: string): void => {
  // A cached error response would make a retried exchange look permanently broken.
  res.status(status).set('Cache-Control', 'no-store').json({ error, error_description: description });
};

/**
 * An authorization error that cannot be redirected: the client or its redirect URI
 * is unknown, so there is no trustworthy place to send the browser (OIDC Core
 * 3.1.2.6). Rendered as plain text — the operator, not an RP, is the audience.
 */
const authorizationFault = (res: Response, description: string): void => {
  res.status(400).type('text/plain').send(`invalid_request: ${description}`);
};

export function registerOidcRoutes(
  app: express.Application,
  usersService: OidcUserStore = new UsersService(),
  // Local-first: the built-in test RP has to resolve on a freshly created database,
  // which is what Docker gives you (compose never seeds).
  clientStore: OidcClientStore = new LocalFirstClientStore(new PrismaOidcClientStore()),
): void {
  const router = express.Router();
  router.use(oidcRateLimit);
  router.use(oidcCors);

  // ---- Metadata -----------------------------------------------------------
  // Served below the issuer (issuer + /.well-known/openid-configuration), which is
  // what an RP library builds by default and what keeps the sub-path deployments
  // working without touching nginx.
  //
  // ONLY below the issuer, though: the other endpoints answer on every origin the
  // backend is reachable at (proxy, direct port, host aliases), but `issuer` is
  // pinned, and RFC 8414 §3.3 obliges a conformant RP to reject a document whose
  // issuer does not match the URL it was fetched from. Answering on the direct
  // backend port would hand such an RP a guaranteed "issuer mismatch"; a 404 that
  // names the canonical URL fails faster and says how to fix it. Only host:port is
  // compared — that is what separates the origins in every documented topology,
  // while the scheme may be offloaded by a proxy that never sets X-Forwarded-Proto.
  const issuerHost = (() => {
    try {
      return new URL(OIDC_PUBLIC_URL).host.toLowerCase();
    } catch {
      // Relative issuer (no configured entity-ID origin): nothing to compare against.
      return undefined;
    }
  })();

  router.get(DISCOVERY_PATH, (req, res) => {
    const requestHost = (req.get('host') ?? '').toLowerCase();
    if (issuerHost && requestHost !== issuerHost) {
      logger.warn(`OIDC discovery requested on host '${requestHost}', but the issuer lives on '${issuerHost}'`);
      res.status(404).json({
        error: 'invalid_request',
        error_description: `Discovery serveras bara på issuerns origin. Peka klienten på ${OIDC_PUBLIC_URL}${DISCOVERY_PATH}.`,
      });
      return;
    }
    res.json(buildDiscoveryDocument());
  });

  router.get('/jwks.json', (_req, res) => {
    res.json(buildJwks());
  });

  // ---- Authorization endpoint ---------------------------------------------
  router.get(
    '/authorize',
    wrap(async (req, res) => {
      const query = req.query as Record<string, unknown>;
      const clientId = param(query, 'client_id');
      const redirectUri = param(query, 'redirect_uri');
      const state = param(query, 'state');

      if (!clientId) {
        authorizationFault(res, 'client_id saknas');
        return;
      }
      const client = await clientStore.getClient(clientId, browsingOrigin(req));
      if (!client) {
        authorizationFault(res, `okänd client_id '${clientId}'`);
        return;
      }
      // Validated before anything is echoed back, so an unregistered callback can
      // never be used as an open redirect.
      if (!redirectUri || !isRegisteredRedirectUri(client, redirectUri)) {
        authorizationFault(res, `redirect_uri är inte registrerad för '${client.name}'`);
        return;
      }

      const responseType = param(query, 'response_type');
      if (responseType !== 'code') {
        redirectAuthorizationError(res, redirectUri, 'unsupported_response_type', 'Endast response_type=code stöds', state);
        return;
      }

      const scope = (param(query, 'scope') ?? 'openid').split(/\s+/).filter(Boolean);
      if (!scope.includes('openid')) {
        redirectAuthorizationError(res, redirectUri, 'invalid_scope', 'scope måste innehålla openid', state);
        return;
      }
      const unsupported = scope.filter(entry => !SUPPORTED_SCOPES.includes(entry as (typeof SUPPORTED_SCOPES)[number]));
      if (unsupported.length > 0) {
        redirectAuthorizationError(res, redirectUri, 'invalid_scope', `Okända scopes: ${unsupported.join(', ')}`, state);
        return;
      }

      const codeChallenge = param(query, 'code_challenge');
      // RFC 7636: omitting the method means `plain`, never S256.
      const requestedMethod = param(query, 'code_challenge_method') ?? (codeChallenge ? 'plain' : undefined);
      let codeChallengeMethod: CodeChallengeMethod | undefined;
      if (requestedMethod !== undefined) {
        if (!isCodeChallengeMethod(requestedMethod)) {
          redirectAuthorizationError(res, redirectUri, 'invalid_request', 'code_challenge_method måste vara S256 eller plain', state);
          return;
        }
        codeChallengeMethod = requestedMethod;
      }
      if (!codeChallenge && (client.requirePkce || client.isPublic)) {
        redirectAuthorizationError(res, redirectUri, 'invalid_request', 'code_challenge krävs för den här klienten', state);
        return;
      }

      const pending: PendingOidcRequest = {
        protocol: 'oidc',
        clientId: client.clientId,
        clientName: client.name,
        redirectUri,
        scope,
        state,
        nonce: param(query, 'nonce'),
        codeChallenge,
        codeChallengeMethod,
      };
      req.session.idpRequest = pending;
      await saveSession(req);

      // SSO: an already-selected test identity is reused without a second prompt,
      // exactly as the SAML role does. `prompt=login` forces the picker back up.
      const forceLogin = param(query, 'prompt') === 'login';
      const user = !forceLogin && req.session.idpIdentityId ? await usersService.getUser(req.session.idpIdentityId) : null;
      if (user) {
        delete req.session.idpRequest;
        await saveSession(req);
        completeAuthorization(req, res, pending, user.id);
        return;
      }

      if (forceLogin) {
        delete req.session.idpIdentityId;
        delete req.session.idpAuthTime;
        await saveSession(req);
      }
      res.redirect(303, LOGIN_URL);
    }),
  );

  // ---- Token endpoint ------------------------------------------------------
  // Back-channel POST from the RP's server: no cookie, no CSRF token — hence the
  // allowlist entry in csrf.middleware.ts.
  router.post(
    '/token',
    wrap(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;

      if (param(body, 'grant_type') !== 'authorization_code') {
        tokenError(res, 400, 'unsupported_grant_type', 'Endast grant_type=authorization_code stöds');
        return;
      }

      // client_secret_basic takes precedence over client_secret_post, per RFC 6749.
      const basic = /^Basic (.+)$/i.exec(req.headers.authorization ?? '');
      const [basicId, basicSecret] = basic ? splitBasic(basic[1]) : [undefined, undefined];
      const clientId = basicId ?? param(body, 'client_id');
      const clientSecret = basicSecret ?? param(body, 'client_secret');

      if (!clientId) {
        tokenError(res, 401, 'invalid_client', 'client_id saknas');
        return;
      }
      const client = await clientStore.getClient(clientId);
      if (!client || !authenticateClient(client, clientSecret)) {
        tokenError(res, 401, 'invalid_client', 'Klienten kunde inte autentiseras');
        return;
      }

      const code = param(body, 'code');
      const grant = code ? authorizationCodes.consume(code) : null;
      if (!grant) {
        tokenError(res, 400, 'invalid_grant', 'Koden är okänd, förbrukad eller för gammal');
        return;
      }
      if (grant.clientId !== client.clientId) {
        tokenError(res, 400, 'invalid_grant', 'Koden tillhör en annan klient');
        return;
      }
      // Required whenever it was sent to /authorize, and it always was here.
      if (param(body, 'redirect_uri') !== grant.redirectUri) {
        tokenError(res, 400, 'invalid_grant', 'redirect_uri matchar inte auktoriseringen');
        return;
      }

      if (grant.codeChallenge) {
        const verifier = param(body, 'code_verifier');
        if (!verifier || !verifyCodeChallenge(grant.codeChallenge, grant.codeChallengeMethod ?? 'plain', verifier)) {
          tokenError(res, 400, 'invalid_grant', 'code_verifier matchar inte code_challenge');
          return;
        }
      }

      const user = await usersService.getUser(grant.userId);
      if (!user) {
        // The identity was deleted between authorization and exchange.
        tokenError(res, 400, 'invalid_grant', 'Testidentiteten finns inte längre');
        return;
      }

      const claims = filterClaimsByScope(claimsForUser(user), grant.scope);
      const accessToken = createAccessToken({ sub: grant.userId, clientId: client.clientId, scope: grant.scope });
      const idToken = createIdToken({
        claims,
        clientId: client.clientId,
        nonce: grant.nonce,
        authTime: grant.authTime,
        accessToken: accessToken.token,
      });

      res.set('Cache-Control', 'no-store').json({
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: accessToken.expiresIn,
        id_token: idToken,
        scope: grant.scope.join(' '),
      });
    }),
  );

  // ---- UserInfo ------------------------------------------------------------
  // Both verbs, as OIDC Core 5.3 requires. POST is in the CSRF allowlist for the
  // same reason /token is: the caller holds a bearer token, not a session.
  const userinfo = wrap(async (req: Request, res: Response) => {
    const token = bearerToken(req.headers.authorization, (req.body as Record<string, unknown> | undefined)?.access_token);
    if (!token) {
      res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'invalid_token', error_description: 'Bearer-token saknas' });
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      res
        .status(401)
        .set('WWW-Authenticate', 'Bearer error="invalid_token"')
        .json({ error: 'invalid_token', error_description: 'Token är ogiltig eller har gått ut' });
      return;
    }

    const user = await usersService.getUser(payload.sub);
    if (!user) {
      res.status(404).json({ error: 'invalid_token', error_description: 'Testidentiteten finns inte längre' });
      return;
    }

    res.set('Cache-Control', 'no-store').json(filterClaimsByScope(claimsForUser(user), payload.scope.split(' ').filter(Boolean)));
  });
  router.get('/userinfo', userinfo);
  router.post('/userinfo', userinfo);

  // ---- RP-initiated logout -------------------------------------------------
  // Clears the SAME field the SAML role uses: one session, one test identity, so
  // logging out of an OIDC client also ends the SAML test session.
  router.get(
    '/end-session',
    wrap(async (req, res) => {
      const query = req.query as Record<string, unknown>;
      const redirectUri = param(query, 'post_logout_redirect_uri');
      const state = param(query, 'state');

      delete req.session.idpIdentityId;
      delete req.session.idpAuthTime;
      delete req.session.idpRequest;
      await saveSession(req);

      // Only a URI the requesting client registered is honoured; anything else
      // falls back to the local identity page rather than becoming an open redirect.
      const clientId = param(query, 'client_id');
      const client = clientId ? await clientStore.getClient(clientId, browsingOrigin(req)) : null;
      if (redirectUri && isValidUrl(redirectUri) && client && isRegisteredPostLogoutRedirectUri(client, redirectUri)) {
        const target = new URL(redirectUri);
        if (state) {
          target.searchParams.set('state', state);
        }
        res.redirect(303, target.toString());
        return;
      }

      res.redirect(303, `${LOGIN_URL}?loggedout=1`);
    }),
  );

  // Convenience alias so an operator poking at the OIDC base path lands on the
  // shared identity page instead of a 404.
  router.get('/login', (_req, res) => {
    res.redirect(303, LOGIN_URL);
  });

  app.use(OIDC_MOUNT_PATH, router);
  if (OIDC_PUBLIC_PATH !== OIDC_MOUNT_PATH) {
    app.use(OIDC_PUBLIC_PATH, router);
    logger.info(`OIDC provider routes mounted at ${OIDC_MOUNT_PATH} and ${OIDC_PUBLIC_PATH}`);
  } else {
    logger.info(`OIDC provider routes mounted at ${OIDC_MOUNT_PATH}`);
  }
}

/** Decode `client_id:client_secret` from a Basic credential. */
function splitBasic(credential: string): [string | undefined, string | undefined] {
  const decoded = Buffer.from(credential, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) {
    return [undefined, undefined];
  }
  // RFC 6749 §2.3.1 form-encodes both halves before base64, but many RPs send them
  // raw — and a raw '%' makes decodeURIComponent throw, which must not 500 here.
  const decodeHalf = (half: string): string => {
    try {
      return decodeURIComponent(half);
    } catch {
      return half;
    }
  };
  return [decodeHalf(decoded.slice(0, separator)), decodeHalf(decoded.slice(separator + 1))];
}

/** Public clients present no secret and are authenticated by PKCE alone. */
function authenticateClient(client: OidcClientRecord, providedSecret: string | undefined): boolean {
  if (client.isPublic || client.clientSecret === '') {
    return providedSecret === undefined || providedSecret === '';
  }
  return providedSecret !== undefined && secretMatches(client.clientSecret, providedSecret);
}
