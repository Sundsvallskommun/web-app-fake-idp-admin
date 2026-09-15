import {
  ADMIN_URL,
  IDP_SHARED_PUBLIC_PATH,
  OIDC_INTERNAL_URL,
  SAML_TEST_PATH,
  OIDC_ISSUER,
  OIDC_MOUNT_PATH,
  OIDC_PUBLIC_PATH,
  OIDC_PUBLIC_URL,
  OIDC_TEST_PATH,
} from '@config';
import { logger } from '@utils/logger';
import { createHash, createPublicKey, type JsonWebKey, randomBytes } from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ClaimRow, renderOidcTest } from '../saml-idp/templates';
import { base64url } from './keys';
import { LOCAL_TEST_CLIENT_ID } from './local-client';
import { DISCOVERY_PATH } from './discovery';

/**
 * The OIDC counterpart of `GET /api/saml/test`: a Relying Party, living in this
 * same process, that runs a real authorization-code + PKCE flow against this
 * backend's own OpenID Provider. It is the loop that proves the OP works end to
 * end — signing, JWKS publication, PKCE, claims and session — without anyone
 * having to wire up an external application first.
 *
 * It cheats at nothing: the code is exchanged over HTTP at `/token` and the ID
 * token is verified against the key published at `/jwks.json`, not against the
 * in-process signing key.
 */
const TEST_SCOPE = 'openid profile email';

/** Back-channel calls must not wedge the page if the app cannot reach itself. */
const BACKCHANNEL_TIMEOUT_MS = 5_000;

const navigation = {
  idpUrl: `${IDP_SHARED_PUBLIC_PATH}/login`,
  adminUrl: ADMIN_URL,
  assetsUrl: ADMIN_URL,
  samlTestUrl: SAML_TEST_PATH,
};

// Fonts live in the admin's /fonts. Behind the proxy that is the same origin;
// in external-proxy mode the admin may sit elsewhere, so allow it explicitly.
const adminOrigin = (() => {
  try {
    return new URL(ADMIN_URL).origin;
  } catch {
    return "'self'";
  }
})();
const TEST_PAGE_CSP = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src 'self' ${adminOrigin}`;

// Discovery stays canonical: it is what an EXTERNAL client must be pointed at,
// regardless of which origin the operator happens to be looking at this page from.
const DISCOVERY_URL = `${OIDC_PUBLIC_URL}${DISCOVERY_PATH}`;

/**
 * The URLs this page hands to the browser.
 *
 * ORIGIN comes from the request, so the loop runs on whichever host and port the
 * operator reached it on. PATHS come from configuration, NOT from `req.baseUrl`:
 * the bundled proxy strips the public prefix before the request arrives
 * (`rewrite ^/idp2/api/(.*)$ /api/$1`), so `req.baseUrl` is the INTERNAL path, and
 * a root-relative URL built from it would drop `/idp2` and 404 back at nginx. The
 * SAML test page anchors to `IDP_PATH_PREFIX` for exactly this reason.
 *
 * The configured path is also valid on the backend's own published port, because
 * the routers are mounted at both the prefixed and bare paths.
 *
 * Only `redirect_uri` has to be absolute (OIDC requires it); the OP accepts the
 * request-derived one because the built-in client is resolved per browsing origin.
 */
export const testRpUrls = (origin: string, oidcBase: string, testBase: string) => ({
  origin,
  loginUrl: `${testBase}/login`,
  logoutUrl: `${testBase}/logout`,
  resultUrl: testBase,
  callbackUrl: `${origin}${testBase}/callback`,
  postLogoutUrl: `${origin}${testBase}`,
  oidcBase,
});

const here = (req: Request) => testRpUrls(`${req.protocol}://${req.get('host')}`, OIDC_PUBLIC_PATH, OIDC_TEST_PATH);

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

const saveSession = (req: Request): Promise<void> => new Promise((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));

const queryParam = (req: Request, name: string): string | undefined => {
  const value = (req.query as Record<string, unknown>)[name];
  return typeof value === 'string' && value ? value : undefined;
};

/** Carries a machine-readable code to the result page, the way the SAML test page's `failMessage` does. */
class TestFlowError extends Error {
  public constructor(
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(code);
  }
}

// ---- Claim formatting -------------------------------------------------------

/** Claims that are seconds-since-epoch; shown as readable time so an operator can spot a bad clock. */
const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf', 'auth_time']);

const formatClaimValue = (name: string, value: unknown): string => {
  if (TIME_CLAIMS.has(name) && typeof value === 'number') {
    return `${new Date(value * 1000).toISOString()} (${value})`;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value) ?? String(value);
};

const toClaimRows = (claims: Record<string, unknown>): ClaimRow[] =>
  Object.entries(claims).map(([name, value]) => ({ name, value: formatClaimValue(name, value) }));

// ---- Back-channel -----------------------------------------------------------

const fetchJson = async (url: string, init: RequestInit, failure: string): Promise<Record<string, unknown>> => {
  let response: globalThis.Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(BACKCHANNEL_TIMEOUT_MS) });
  } catch (error) {
    throw new TestFlowError(failure, `${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const body = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new TestFlowError(failure, `${response.status} ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    const error = parsed as { error?: string; error_description?: string };
    throw new TestFlowError(failure, `${response.status} ${error.error ?? ''} ${error.error_description ?? ''}`.trim());
  }
  return parsed as Record<string, unknown>;
};

/**
 * Verify the ID token exactly as an external RP would: pull the key out of the
 * published JWKS by `kid`, then check signature, issuer, audience and nonce. Using
 * the in-process key here would make the test unable to catch a broken JWKS.
 */
const verifyIdToken = async (idToken: string, nonce: string): Promise<Record<string, unknown>> => {
  const jwks = (await fetchJson(`${OIDC_INTERNAL_URL}/jwks.json`, { method: 'GET' }, 'OIDC_INVALID_ID_TOKEN')) as {
    keys?: Record<string, unknown>[];
  };
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) {
    throw new TestFlowError('OIDC_INVALID_ID_TOKEN', 'id_token kunde inte avkodas');
  }

  const jwk = jwks.keys?.find(key => key.kid === decoded.header.kid) ?? jwks.keys?.[0];
  if (!jwk) {
    throw new TestFlowError('OIDC_INVALID_ID_TOKEN', 'jwks.json innehöll ingen nyckel');
  }

  let payload: jwt.JwtPayload;
  try {
    const key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
    const verified = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      issuer: OIDC_ISSUER,
      audience: LOCAL_TEST_CLIENT_ID,
    });
    if (typeof verified === 'string') {
      throw new Error('id_token saknade JSON-payload');
    }
    payload = verified;
  } catch (error) {
    throw new TestFlowError('OIDC_INVALID_ID_TOKEN', error instanceof Error ? error.message : String(error));
  }

  // Checked explicitly rather than through a verify option: the nonce is what ties
  // this token to this browser session, so a silent mismatch must not be possible.
  if (payload.nonce !== nonce) {
    throw new TestFlowError('OIDC_INVALID_ID_TOKEN', 'nonce i ID-token matchar inte den som skickades');
  }
  return payload;
};

// ---- Routes -----------------------------------------------------------------

export function registerOidcTestRoutes(app: express.Application): void {
  const router = express.Router();

  router.get('/', (req, res) => {
    const result = req.session.oidcTestResult;
    const urls = here(req);
    res.setHeader('Content-Security-Policy', TEST_PAGE_CSP);
    res.send(
      renderOidcTest({
        navigation,
        loginUrl: urls.loginUrl,
        logoutUrl: urls.logoutUrl,
        discoveryUrl: DISCOVERY_URL,
        result: result && {
          scope: result.scope,
          idTokenClaims: toClaimRows(result.idTokenClaims),
          userinfoClaims: toClaimRows(result.userinfoClaims),
        },
        error: queryParam(req, 'failMessage'),
        errorDetail: queryParam(req, 'failDetail'),
      }),
    );
  });

  router.get(
    '/login',
    wrap(async (req, res) => {
      const verifier = base64url(randomBytes(32));
      req.session.oidcTest = {
        state: base64url(randomBytes(16)),
        nonce: base64url(randomBytes(16)),
        verifier,
      };
      delete req.session.oidcTestResult;
      await saveSession(req);

      const urls = here(req);
      const query = new URLSearchParams({
        response_type: 'code',
        client_id: LOCAL_TEST_CLIENT_ID,
        redirect_uri: urls.callbackUrl,
        scope: TEST_SCOPE,
        state: req.session.oidcTest.state,
        nonce: req.session.oidcTest.nonce,
        code_challenge: base64url(createHash('sha256').update(verifier, 'ascii').digest()),
        code_challenge_method: 'S256',
      });

      // Root-relative: stays on the origin the operator is already browsing.
      res.redirect(303, `${urls.oidcBase}/authorize?${query.toString()}`);
    }),
  );

  router.get(
    '/callback',
    wrap(async (req, res) => {
      const urls = here(req);
      const pending = req.session.oidcTest;
      delete req.session.oidcTest;
      await saveSession(req);

      try {
        const authorizeError = queryParam(req, 'error');
        if (authorizeError) {
          throw new TestFlowError('OIDC_AUTHORIZE_ERROR', `${authorizeError}: ${queryParam(req, 'error_description') ?? ''}`.trim());
        }
        // `state` is the RP's own CSRF defence; without the session half there is
        // nothing to compare against and the response cannot be trusted.
        if (!pending || queryParam(req, 'state') !== pending.state) {
          throw new TestFlowError('OIDC_STATE_MISMATCH');
        }
        const code = queryParam(req, 'code');
        if (!code) {
          throw new TestFlowError('OIDC_NO_CODE');
        }

        const tokens = await fetchJson(
          `${OIDC_INTERNAL_URL}/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: urls.callbackUrl,
              client_id: LOCAL_TEST_CLIENT_ID,
              code_verifier: pending.verifier,
            }).toString(),
          },
          'OIDC_TOKEN_REQUEST_FAILED',
        );

        const idToken = typeof tokens.id_token === 'string' ? tokens.id_token : undefined;
        const accessToken = typeof tokens.access_token === 'string' ? tokens.access_token : undefined;
        if (!idToken || !accessToken) {
          throw new TestFlowError('OIDC_TOKEN_REQUEST_FAILED', 'svaret saknade id_token eller access_token');
        }

        const idTokenClaims = await verifyIdToken(idToken, pending.nonce);
        const userinfoClaims = await fetchJson(
          `${OIDC_INTERNAL_URL}/userinfo`,
          { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
          'OIDC_USERINFO_FAILED',
        );

        req.session.oidcTestResult = {
          scope: typeof tokens.scope === 'string' ? tokens.scope : '',
          idTokenClaims,
          userinfoClaims,
        };
        await saveSession(req);
        res.redirect(303, urls.resultUrl);
      } catch (error) {
        if (!(error instanceof TestFlowError)) {
          throw error;
        }
        logger.warn(`Local OIDC test flow failed: ${error.code}${error.detail ? ` (${error.detail})` : ''}`);
        const failure = new URLSearchParams({ failMessage: error.code });
        if (error.detail) {
          failure.set('failDetail', error.detail);
        }
        res.redirect(303, `${urls.resultUrl}?${failure.toString()}`);
      }
    }),
  );

  router.get(
    '/logout',
    wrap(async (req, res) => {
      delete req.session.oidcTestResult;
      delete req.session.oidcTest;
      await saveSession(req);

      // Go out through the OP's own RP-initiated logout rather than just dropping
      // the local result — that is the half an external RP would exercise.
      const urls = here(req);
      const query = new URLSearchParams({
        client_id: LOCAL_TEST_CLIENT_ID,
        post_logout_redirect_uri: urls.postLogoutUrl,
      });
      res.redirect(303, `${urls.oidcBase}/end-session?${query.toString()}`);
    }),
  );

  app.use(`${OIDC_MOUNT_PATH}/test`, router);
  if (OIDC_PUBLIC_PATH !== OIDC_MOUNT_PATH) {
    app.use(`${OIDC_PUBLIC_PATH}/test`, router);
  }
  logger.info(`Local OIDC test client mounted at ${OIDC_PUBLIC_PATH}/test`);
}
