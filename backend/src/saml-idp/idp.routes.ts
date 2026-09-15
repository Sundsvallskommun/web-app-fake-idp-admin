import {
  ADMIN_URL,
  IDP_MOUNT_PATH,
  IDP_PUBLIC_PATH,
  IDP_SHARED_MOUNT_PATH,
  IDP_SHARED_PUBLIC_PATH,
  OIDC_TEST_PATH,
  SAML_IDP_ENUMERATE_USERS,
  SAML_TEST_PATH,
} from '@config';
import { generateCsrfToken } from '@middlewares/csrf.middleware';
import { UsersService } from '@services/users.service';
import { logger } from '@utils/logger';
import { isValidUrl } from '@utils/util';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { completeAuthorization } from '../oidc-idp/flow';
import { buildIdpMetadata } from './idp-metadata';
import { parseRequest } from './request-parser';
import { createResponse, UserWithAttributes } from './response-builder';
import { LoginTarget, PageNavigation, renderIdentitySession, renderLogin, renderPostResponse } from './templates';

const AUTHENTICATE_ACTION = `${IDP_SHARED_PUBLIC_PATH}/authenticate`;
const LOGIN_URL = `${IDP_SHARED_PUBLIC_PATH}/login`;
const LOGOUT_ACTION = `${IDP_SHARED_PUBLIC_PATH}/logout`;
const navigation: PageNavigation = {
  idpUrl: LOGIN_URL,
  adminUrl: ADMIN_URL,
  assetsUrl: ADMIN_URL,
  samlTestUrl: SAML_TEST_PATH,
  oidcTestUrl: OIDC_TEST_PATH,
};

const idpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export interface IdpUserStore {
  getUser(id: string): Promise<UserWithAttributes | null>;
  getUsers(): Promise<UserWithAttributes[]>;
  getUsersByUsername(username: string): Promise<UserWithAttributes[]>;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

const saveSession = (req: Request): Promise<void> => new Promise((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));

// Typsnitten bor i adminens /fonts. Via proxyn är det samma origin ('self');
// i external-proxy-läget kan adminen ligga på annan origin — tillåt den explicit.
const adminOrigin = (() => {
  try {
    return new URL(ADMIN_URL).origin;
  } catch {
    return "'self'";
  }
})();

function idpCsp(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src 'self' ${adminOrigin}; form-action *`,
  );
  next();
}

async function validateIdpUser(req: Request, usersService: IdpUserStore): Promise<UserWithAttributes | null> {
  const form = { ...(req.query as Record<string, unknown>), ...(req.body as Record<string, unknown>) };

  if (typeof form.userid === 'string' && form.userid) {
    return usersService.getUser(form.userid);
  }

  if (typeof form.username === 'string' && typeof form.password === 'string' && form.username && form.password) {
    const candidates = await usersService.getUsersByUsername(form.username);
    return candidates.find(user => user.password === form.password) ?? null;
  }

  return null;
}

const describeTarget = (request: NonNullable<Request['session']['idpRequest']>): LoginTarget => {
  if (request.protocol === 'oidc') {
    // An OIDC client is registered by name, so say who it is rather than guessing from a host.
    return { name: request.clientName, url: request.redirectUri, protocolLabel: 'OIDC-testinloggning' };
  }

  const destination = request.destination;
  try {
    return { name: new URL(destination).host, url: destination, protocolLabel: 'SAML-testinloggning' };
  } catch {
    return { name: 'Ansluten testapplikation', url: destination, protocolLabel: 'SAML-testinloggning' };
  }
};

async function selectedIdentity(req: Request, usersService: IdpUserStore): Promise<UserWithAttributes | null> {
  if (!req.session.idpIdentityId) {
    return null;
  }

  const user = await usersService.getUser(req.session.idpIdentityId);
  if (!user) {
    delete req.session.idpIdentityId;
    await saveSession(req);
  }
  return user;
}

/**
 * Answer whichever authorization request is parked in the session. SAML gets a
 * signed assertion auto-POSTed back; OIDC gets a single-use code on a redirect.
 * Either way the pending request is consumed first, so a reload cannot replay it.
 */
async function resumePendingRequest(req: Request, res: Response, user: UserWithAttributes): Promise<void> {
  const request = req.session.idpRequest;
  if (!request) {
    throw new Error('No authorization request in session');
  }

  delete req.session.idpRequest;
  await saveSession(req);

  if (request.protocol === 'oidc') {
    completeAuthorization(req, res, request, user.id);
    return;
  }

  const built = createResponse(request, user);
  res.send(renderPostResponse({ action: built.action, samlResponse: built.samlResponse, relayState: built.relayState }));
}

async function renderLoginPage(req: Request, usersService: IdpUserStore, options?: { error?: string; notice?: string }): Promise<string> {
  const request = req.session.idpRequest;
  const users = SAML_IDP_ENUMERATE_USERS
    ? (await usersService.getUsers()).map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        applications: (user.applications ?? []).map(application => application.name),
      }))
    : [];

  return renderLogin({
    action: AUTHENTICATE_ACTION,
    csrfToken: generateCsrfToken(req),
    navigation,
    users,
    enumerateUsers: SAML_IDP_ENUMERATE_USERS,
    target: request ? describeTarget(request) : undefined,
    error: options?.error,
    notice: options?.notice,
  });
}
async function endIdentitySession(req: Request, res: Response): Promise<void> {
  delete req.session.idpIdentityId;
  delete req.session.idpAuthTime;
  await saveSession(req);

  const relayState = req.query.RelayState;
  if (typeof relayState === 'string' && isValidUrl(relayState)) {
    res.redirect(303, relayState);
    return;
  }

  res.redirect(303, `${LOGIN_URL}?loggedout=1`);
}

async function renderIdpHome(req: Request, usersService: IdpUserStore): Promise<string> {
  const user = await selectedIdentity(req, usersService);
  if (!user) {
    const notice = req.query.loggedout === '1' ? 'Testidentiteten är utloggad.' : undefined;
    return renderLoginPage(req, usersService, { notice });
  }

  return renderIdentitySession({
    identity: user,
    groups: user.groups ?? [],
    csrfToken: generateCsrfToken(req),
    navigation,
    logoutAction: LOGOUT_ACTION,
  });
}

async function handleSso(
  req: Request,
  res: Response,
  source: { SAMLRequest?: string; RelayState?: string },
  usersService: IdpUserStore,
): Promise<void> {
  req.session.idpRequest = await parseRequest(source);
  await saveSession(req);

  const user = await selectedIdentity(req, usersService);
  if (user) {
    await resumePendingRequest(req, res, user);
    return;
  }

  res.send(await renderLoginPage(req, usersService));
}

export function registerIdpRoutes(app: express.Application, usersService: IdpUserStore = new UsersService()): void {
  const authenticateHandler = wrap(async (req: Request, res: Response) => {
    const user = await validateIdpUser(req, usersService);
    if (!user) {
      res.status(401).send(await renderLoginPage(req, usersService, { error: 'Fel användarnamn eller lösenord' }));
      return;
    }

    req.session.idpIdentityId = user.id;
    req.session.idpAuthTime = Math.floor(Date.now() / 1000);
    if (req.session.idpRequest) {
      await resumePendingRequest(req, res, user);
      return;
    }

    await saveSession(req);
    res.redirect(303, LOGIN_URL);
  });

  const logoutHandler = wrap(endIdentitySession);

  const loginHandler = wrap(async (req: Request, res: Response) => {
    res.send(await renderIdpHome(req, usersService));
  });

  // The picker and its session routes serve both protocol roles, so they exist on
  // two routers: canonically on the protocol-neutral mount, and as aliases on the
  // SAML-era mount. Two routers rather than one mounted twice, so a request only
  // passes the CSP/rate-limit middleware once — the limiter instance is shared,
  // which keeps the counting shared too.
  const addPickerRoutes = (router: express.Router) => {
    router.post('/authenticate', authenticateHandler);
    router.get('/logout', logoutHandler);
    router.post('/logout', logoutHandler);
    router.get('/login', loginHandler);
  };

  const samlRouter = express.Router();
  samlRouter.use(idpCsp);
  samlRouter.use(idpRateLimit);

  samlRouter.get(
    '/sso',
    wrap((req, res) => handleSso(req, res, req.query as { SAMLRequest?: string; RelayState?: string }, usersService)),
  );
  samlRouter.post(
    '/sso',
    wrap((req, res) => handleSso(req, res, req.body as { SAMLRequest?: string; RelayState?: string }, usersService)),
  );

  addPickerRoutes(samlRouter);

  samlRouter.get('/metadata', (_req, res) => {
    res.type('application/xml').send(buildIdpMetadata());
  });

  const pickerRouter = express.Router();
  pickerRouter.use(idpCsp);
  pickerRouter.use(idpRateLimit);
  addPickerRoutes(pickerRouter);

  app.use(IDP_MOUNT_PATH, samlRouter);
  if (IDP_PUBLIC_PATH !== IDP_MOUNT_PATH) {
    app.use(IDP_PUBLIC_PATH, samlRouter);
    logger.info(`SAML IdP routes mounted at ${IDP_MOUNT_PATH} and ${IDP_PUBLIC_PATH}`);
  } else {
    logger.info(`SAML IdP routes mounted at ${IDP_MOUNT_PATH}`);
  }

  app.use(IDP_SHARED_MOUNT_PATH, pickerRouter);
  if (IDP_SHARED_PUBLIC_PATH !== IDP_SHARED_MOUNT_PATH) {
    app.use(IDP_SHARED_PUBLIC_PATH, pickerRouter);
    logger.info(`Shared identity picker mounted at ${IDP_SHARED_MOUNT_PATH} and ${IDP_SHARED_PUBLIC_PATH}`);
  } else {
    logger.info(`Shared identity picker mounted at ${IDP_SHARED_MOUNT_PATH}`);
  }
}
