import { IDP_MOUNT_PATH, IDP_PUBLIC_PATH, SAML_IDP_ENUMERATE_USERS } from '@config';
import { UsersService } from '@services/users.service';
import { logger } from '@utils/logger';
import { isValidUrl } from '@utils/util';
import express, { NextFunction, Request, Response } from 'express';
import { buildIdpMetadata } from './idp-metadata';
import { parseRequest } from './request-parser';
import { createResponse, UserWithAttributes } from './response-builder';
import { renderDetails, renderLogin, renderPostResponse } from './templates';

// Browser-facing action URLs use the PUBLIC base path (so they resolve correctly
// when the IdP is served behind a reverse proxy at a sub-path); the router itself
// is mounted at the internal IDP_MOUNT_PATH below.
const AUTHENTICATE_ACTION = `${IDP_PUBLIC_PATH}/authenticate`;
const LOGIN_ACTION = `${IDP_PUBLIC_PATH}/login`;
const LOGOUT_ACTION = `${IDP_PUBLIC_PATH}/logout`;

const usersService = new UsersService();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wrap an async handler so rejected promises reach the error middleware (Express 4 won't). */
const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

/** Persist the session and resolve once written (needed between /sso and /authenticate). */
const saveSession = (req: Request): Promise<void> => new Promise((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));

/**
 * Relax helmet's default CSP for the IdP HTML pages: the postResponse page
 * relies on an inline `onload` submit and the pages use an inline <style>, and
 * the auto-submit form posts to the SP's ACS (any origin).
 */
function idpCsp(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action *");
  next();
}

/** Resolve the IdP-logged-in user (with attributes) from the session, if any. */
async function loadIdpUser(req: Request): Promise<UserWithAttributes | null> {
  const id = req.session.idpUser?.id;
  if (!id) return null;
  return (await usersService.getUser(id)) as UserWithAttributes | null;
}

/** Validate credentials against the Prisma user store (plaintext, by design). */
async function validateIdpUser(req: Request): Promise<UserWithAttributes | null> {
  const frm = { ...(req.query as Record<string, unknown>), ...(req.body as Record<string, unknown>) };
  let user: UserWithAttributes | null = null;

  if (typeof frm.userid === 'string' && frm.userid) {
    user = (await usersService.getUser(frm.userid)) as UserWithAttributes | null;
  } else if (typeof frm.username === 'string' && typeof frm.password === 'string' && frm.username && frm.password) {
    // `username` is not unique in the schema, so match password in JS.
    const candidates = await usersService.getUsersByUsername(frm.username);
    user = (candidates.find(u => u.password === frm.password) as UserWithAttributes | undefined) ?? null;
  }

  if (user) {
    req.session.idpUser = { id: user.id };
    await saveSession(req);
  }
  return user;
}

/** Render the auto-submitting SAML Response for the stored request + user. */
function respondWithAssertion(req: Request, res: Response, user: UserWithAttributes) {
  const request = req.session.idpRequest;
  if (!request) {
    throw new Error('No SAML request in session');
  }
  const built = createResponse(request, user);
  res.send(renderPostResponse({ action: built.action, samlResponse: built.samlResponse, relayState: built.relayState }));
}

/** Store the inbound AuthnRequest, then either post the assertion or show the login page. */
async function handleSso(req: Request, res: Response, source: { SAMLRequest?: string; RelayState?: string }) {
  const request = await parseRequest(source);
  req.session.idpRequest = request;
  await saveSession(req);

  const user = await loadIdpUser(req);
  if (user) {
    respondWithAssertion(req, res, user);
  } else {
    res.send(await renderLoginPage(AUTHENTICATE_ACTION));
  }
}

/** Build the login page, including the user dropdown when enumeration is enabled. */
async function renderLoginPage(action: string, error?: string): Promise<string> {
  const users = SAML_IDP_ENUMERATE_USERS ? (await usersService.getUsers()).map(u => ({ id: u.id, username: u.username })) : [];
  return renderLogin({ action, users, enumerateUsers: SAML_IDP_ENUMERATE_USERS, error });
}

export function registerIdpRoutes(app: express.Application): void {
  const router = express.Router();
  router.use(idpCsp);

  router.get(
    '/sso',
    wrap((req, res) => handleSso(req, res, req.query as { SAMLRequest?: string; RelayState?: string })),
  );
  router.post(
    '/sso',
    wrap((req, res) => handleSso(req, res, req.body as { SAMLRequest?: string; RelayState?: string })),
  );

  router.post(
    '/authenticate',
    wrap(async (req, res) => {
      const user = await validateIdpUser(req);
      if (user) {
        respondWithAssertion(req, res, user);
      } else {
        res.send(await renderLoginPage(AUTHENTICATE_ACTION, 'Wrong username or password'));
      }
    }),
  );

  router.get(
    '/login',
    wrap(async (req, res) => {
      const user = await loadIdpUser(req);
      if (user) {
        res.send(renderDetails({ user, logoutAction: LOGOUT_ACTION }));
      } else {
        res.send(await renderLoginPage(LOGIN_ACTION));
      }
    }),
  );
  router.post(
    '/login',
    wrap(async (req, res) => {
      const user = await validateIdpUser(req);
      if (user) {
        res.send(renderDetails({ user, logoutAction: LOGOUT_ACTION }));
      } else {
        res.redirect(LOGIN_ACTION);
      }
    }),
  );

  // Logout — clear only the IdP session fields (the session is shared with the SP side).
  router.get(
    '/logout',
    wrap(async (req, res) => {
      delete req.session.idpUser;
      delete req.session.idpRequest;
      await saveSession(req);

      const relayState = req.query.RelayState;
      if (typeof relayState === 'string' && isValidUrl(relayState)) {
        res.redirect(relayState);
      } else {
        res.redirect(LOGIN_ACTION);
      }
    }),
  );

  router.get('/metadata', (_req, res) => {
    res.type('application/xml').send(buildIdpMetadata());
  });

  app.use(IDP_MOUNT_PATH, router);
  // When a public sub-path prefix is configured, also serve the IdP there so it
  // works whether reached directly or via a reverse proxy that doesn't rewrite.
  if (IDP_PUBLIC_PATH !== IDP_MOUNT_PATH) {
    app.use(IDP_PUBLIC_PATH, router);
    logger.info(`SAML IdP routes mounted at ${IDP_MOUNT_PATH} and ${IDP_PUBLIC_PATH}`);
  } else {
    logger.info(`SAML IdP routes mounted at ${IDP_MOUNT_PATH}`);
  }
}
