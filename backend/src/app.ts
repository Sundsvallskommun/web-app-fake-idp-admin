import {
  ADMIN_URL,
  APP_NAME,
  BASE_URL_PREFIX,
  CREDENTIALS,
  LOG_FORMAT,
  NODE_ENV,
  ORIGIN,
  PORT,
  IDP_PATH_PREFIX,
  IDP_PUBLIC_PATH,
  SAML_CALLBACK_URL,
  SAML_ENTRY_SSO,
  SAML_FAILURE_REDIRECT,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SAML_SUCCESS_REDIRECT,
  SECRET_KEY,
  SESSION_MEMORY,
  SWAGGER_ENABLED,
} from '@config';
import errorMiddleware from '@middlewares/error.middleware';
import { csrfProtection, generateCsrfToken } from '@middlewares/csrf.middleware';
import { Strategy, VerifiedCallback } from '@node-saml/passport-saml';
import { logger, stream } from '@utils/logger';
import { AdminAuthService } from '@services/admin-auth.service';
import bodyParser from 'body-parser';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import hpp from 'hpp';
import createMemoryStore from 'memorystore';
import morgan from 'morgan';
import passport from 'passport';
import { join } from 'path';
import 'reflect-metadata';
import { getMetadataArgsStorage, useExpressServer } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import createFileStore from 'session-file-store';
import swaggerUi from 'swagger-ui-express';
import { HttpException } from './exceptions/HttpException';
import { Profile } from './interfaces/profile.interface';
import { User } from './interfaces/users.interface';
import { additionalConverters } from './utils/custom-validation-classes';
import { isValidOrigin } from './utils/isValidOrigin';
import { isValidUrl } from './utils/util';
import { registerIdpRoutes } from './saml-idp/idp.routes';
import { renderSamlTest } from './saml-idp/templates';

const corsWhitelist = ORIGIN.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const SessionStoreCreate = SESSION_MEMORY ? createMemoryStore(session) : createFileStore(session);
const sessionTTL = 4 * 24 * 60 * 60;
// NOTE: memory uses ms while file uses seconds
const createSessionStore = (path: string) => new SessionStoreCreate(SESSION_MEMORY ? { checkPeriod: sessionTTL * 1000 } : { sessionTTL, path });

const adminSessionStore = createSessionStore('./data/sessions/admin');
const samlSessionStore = createSessionStore('./data/sessions/saml');

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

const samlStrategy = new Strategy(
  {
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    callbackUrl: SAML_CALLBACK_URL,
    entryPoint: SAML_ENTRY_SSO,
    // decryptionPvk: SAML_PRIVATE_KEY,
    privateKey: SAML_PRIVATE_KEY,
    // Identity Provider's public key
    idpCert: SAML_IDP_PUBLIC_CERT,
    issuer: SAML_ISSUER,
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 1000,
    audience: false,
    logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL,
  },
  async function (profile: Profile, done: VerifiedCallback) {
    if (!profile) {
      return done({
        name: 'SAML_MISSING_PROFILE',
        message: 'Missing SAML profile',
      });
    }
    const { givenName, surname, citizenIdentifier, username } = profile;

    // The local test SP demands the same three attributes the real Sundsvall
    // service providers do. Naming the missing ones turns an opaque error code
    // into something the test page can tell the operator to go and fill in.
    const missingAttributes = Object.entries({ givenName, surname, citizenIdentifier })
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingAttributes.length > 0) {
      // Object.assign, not a literal: the callback's `Error` type has no room for
      // the extra field, and the login callback below forwards it to the test page.
      return done(
        Object.assign(new Error(`Missing profile attributes: ${missingAttributes.join(', ')}`), {
          name: 'SAML_MISSING_ATTRIBUTES',
          missingAttributes,
        }),
      );
    }

    try {
      const findUser: User = {
        username: username,
        name: `${givenName} ${surname}`,
        givenName: givenName,
        surname: surname,
      };

      done(null, findUser);
    } catch (err) {
      if (err instanceof HttpException && err?.status === 404) {
        // Handle missing person form Citizen
      }
      done(err);
    }
  },
  async function (profile: Profile, done: VerifiedCallback) {
    return done(null, {});
  },
);

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  public swaggerEnabled: boolean;

  constructor(Controllers: Function[]) {
    this.app = express();
    this.app.set('trust proxy', 1);
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;
    this.swaggerEnabled = SWAGGER_ENABLED || false;

    this.initializeDataFolders();

    this.initializeMiddlewares();
    this.initializeRoutes(Controllers);
    if (this.swaggerEnabled) {
      this.initializeSwagger(Controllers);
    }
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
      if (new AdminAuthService().usesDefaultCredentials()) {
        // Stacken kan frontas publikt (docker-compose.external-proxy.yml). Med
        // kvarstående defaultlösenord är IdP:n öppen och utfärdar giltiga
        // SAML-assertions till anslutna SP-appar.
        logger.warn(`⚠️  Adminkontot använder defaultlösenordet 'admin'. Sätt ADMIN_PASSWORD innan stacken exponeras utanför localhost.`);
      }
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    const samlPaths = [`${BASE_URL_PREFIX}/saml`, `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml`];
    const adminSessionMiddleware = session({
      name: 'fake-idp-admin.sid',
      secret: SECRET_KEY,
      resave: false,
      saveUninitialized: false,
      store: adminSessionStore,
      cookie: { httpOnly: true, sameSite: 'strict', secure: 'auto' },
    });
    const samlSessionMiddleware = session({
      // Browser cookies ignore ports, so keep the IdP/SP session name distinct
      // from both the admin panel and other locally hosted applications.
      name: 'fake-idp.sid',
      secret: SECRET_KEY,
      resave: false,
      saveUninitialized: false,
      store: samlSessionStore,
      cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto' },
    });

    this.app.use((req, res, next) => {
      const usesSamlSession = samlPaths.some(path => req.path === path || req.path.startsWith(`${path}/`));
      const middleware = usesSamlSession ? samlSessionMiddleware : adminSessionMiddleware;
      return middleware(req, res, next);
    });

    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.use('saml', samlStrategy);

    const corsMiddleware = cors({
      credentials: CREDENTIALS,
      origin: function (origin, callback) {
        if (origin === undefined || corsWhitelist.indexOf(origin) !== -1 || corsWhitelist.indexOf('*') !== -1) {
          callback(null, true);
        } else {
          if (NODE_ENV == 'development') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
    });
    this.app.use((req, res, next) => {
      if (samlPaths.some(path => req.path === path || req.path.startsWith(`${path}/`))) {
        return next();
      }
      return corsMiddleware(req, res, next);
    });

    this.app.get(`${BASE_URL_PREFIX}/admin-auth/csrf`, (req, res) => {
      res.send({ data: { token: generateCsrfToken(req) }, message: 'success' });
    });
    // CSRF-invarianten: varje state-ändrande route registreras EFTER den här
    // raden. Skyddet är csrf-sync (synchronizer tokens; csurf är deprecerat) —
    // CodeQL:s js/missing-token-validation känner bara igen csurf/lusca och
    // flaggar därför cookie-parsern ovan som falsk positiv. Endast de två
    // SAML-POST-bindningarna undantas (allowlist i csrf.middleware.ts):
    // SAML HTTP-POST är cross-site per protokoll och skyddas av signerade
    // assertions + InResponseTo istället för tokens.
    this.app.use(csrfProtection);

    const samlLoginUrl = `${IDP_PATH_PREFIX}${BASE_URL_PREFIX}/saml/login`;
    this.app.get(`${BASE_URL_PREFIX}/saml/test`, (req, res) => {
      const user = req.user as User | undefined;
      const error = typeof req.query.failMessage === 'string' ? req.query.failMessage : undefined;
      const missingAttributes =
        typeof req.query.missingAttributes === 'string'
          ? req.query.missingAttributes
              .split(',')
              .map(attribute => attribute.trim())
              .filter(Boolean)
          : undefined;

      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      res.send(
        renderSamlTest({
          identity: user ? { name: user.name, username: user.username } : undefined,
          navigation: { idpUrl: `${IDP_PUBLIC_PATH}/login`, adminUrl: ADMIN_URL },
          samlLoginUrl,
          error,
          missingAttributes,
        }),
      );
    });

    this.app.get(
      `${BASE_URL_PREFIX}/saml/login`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        } else if (req.query.successRedirect) {
          req.query.RelayState = req.query.successRedirect;
        }
        if (req.query.failureRedirect) {
          req.query.RelayState = `${req.query.RelayState},${req.query.failureRedirect}`;
        }
        next();
      },
      (req, res, next) => {
        passport.authenticate('saml', {
          failureRedirect: SAML_FAILURE_REDIRECT,
        })(req, res, next);
      },
    );

    this.app.get(`${BASE_URL_PREFIX}/saml/metadata`, (req, res) => {
      res.type('application/xml');
      const metadata = samlStrategy.generateServiceProviderMetadata(SAML_PUBLIC_KEY, SAML_PUBLIC_KEY);
      res.status(200).send(metadata);
    });

    this.app.get(
      `${BASE_URL_PREFIX}/saml/logout`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        } else if (req.query.successRedirect) {
          req.query.RelayState = req.query.successRedirect;
        }
        next();
      },
      (req, res, next) => {
        let successRedirect = SAML_SUCCESS_REDIRECT;
        if (typeof req.query.successRedirect === 'string' && isValidUrl(req.query.successRedirect)) {
          successRedirect = req.query.successRedirect;
        }

        samlStrategy.logout(req as any, () => {
          req.logout(err => {
            if (err) {
              return next(err);
            }
            delete req.session.idpRequest;
            req.session.save(saveErr => {
              if (saveErr) {
                return next(saveErr);
              }
              res.redirect(successRedirect);
            });
          });
        });
      },
    );

    this.app.get(`${BASE_URL_PREFIX}/saml/logout/callback`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      req.logout(err => {
        if (err) {
          return next(err);
        }

        let successRedirect: URL, failureRedirect: URL;
        const urls = req?.body?.RelayState.split(',');

        if (isValidUrl(urls[0])) {
          successRedirect = new URL(urls[0]);
        } else {
          successRedirect = new URL(SAML_SUCCESS_REDIRECT);
        }
        if (isValidUrl(urls[1])) {
          failureRedirect = new URL(urls[1]);
        } else {
          failureRedirect = successRedirect;
        }

        const queries = new URLSearchParams(failureRedirect.searchParams);

        if (req.session.messages?.length > 0) {
          queries.append('failMessage', req.session.messages[0]);
        } else {
          queries.append('failMessage', 'SAML_UNKNOWN_ERROR');
        }

        if (failureRedirect) {
          res.redirect(failureRedirect.toString());
        } else {
          res.redirect(successRedirect.toString());
        }
      });
    });

    this.app.post(`${BASE_URL_PREFIX}/saml/login/callback`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      let successRedirect: URL, failureRedirect: URL;

      const urls = req?.body?.RelayState.split(',');

      if (isValidUrl(urls[0]) && isValidOrigin(urls[0])) {
        successRedirect = new URL(urls[0]);
      } else {
        successRedirect = new URL(SAML_SUCCESS_REDIRECT);
      }
      if (isValidUrl(urls[1]) && isValidOrigin(urls[1])) {
        failureRedirect = new URL(urls[1]);
      } else {
        failureRedirect = successRedirect;
      }

      passport.authenticate('saml', (err, user) => {
        if (err) {
          const queries = new URLSearchParams(failureRedirect.searchParams);
          if (err?.name) {
            queries.append('failMessage', err.name);
          } else {
            queries.append('failMessage', 'SAML_UNKNOWN_ERROR');
          }
          // Extra detail, never a replacement: `failMessage` keeps its exact
          // codes so existing consumers of the failure redirect are unaffected.
          if (Array.isArray(err?.missingAttributes) && err.missingAttributes.length > 0) {
            queries.append('missingAttributes', err.missingAttributes.join(','));
          }
          failureRedirect.search = queries.toString();
          res.redirect(failureRedirect.toString());
        } else if (!user) {
          const failMessage = new URLSearchParams(failureRedirect.searchParams);
          failMessage.append('failMessage', 'NO_USER');
          failureRedirect.search = failMessage.toString();
          res.redirect(failureRedirect.toString());
        } else {
          // Keep the SAML session's transient return information when passport
          // regenerates it as protection against session fixation.
          req.login(user, { session: true, keepSessionInfo: true }, loginErr => {
            if (loginErr) {
              const failMessage = new URLSearchParams(failureRedirect.searchParams);
              failMessage.append('failMessage', 'SAML_UNKNOWN_ERROR');
              failureRedirect.search = failMessage.toString();
              return res.redirect(failureRedirect.toString());
            }
            return res.redirect(successRedirect.toString());
          });
        }
      })(req, res, next);
    });

    registerIdpRoutes(this.app);
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      controllers: controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger(controllers: Function[]) {
    const schemas = validationMetadatasToSchemas({
      classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: '#/components/schemas/',
      additionalConverters: additionalConverters,
    });

    const routingControllersOptions = {
      routePrefix: `${BASE_URL_PREFIX}`,
      controllers: controllers,
    };

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(storage, routingControllersOptions, {
      components: {
        schemas: schemas as { [schema: string]: unknown },
        securitySchemes: {
          basicAuth: {
            scheme: 'basic',
            type: 'http',
          },
        },
      },
      info: {
        title: `${APP_NAME} Proxy API`,
        description: '',
        version: '1.0.0',
      },
    });

    this.app.use(`${BASE_URL_PREFIX}/swagger.json`, (req: express.Request, res: express.Response) => {
      res.json(spec);
    });
    this.app.use(`${BASE_URL_PREFIX}/api-docs`, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeDataFolders() {
    const databaseDir: string = join(__dirname, '../data/database');
    if (!existsSync(databaseDir)) {
      mkdirSync(databaseDir, { recursive: true });
    }
    const logsDir: string = join(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    const sessionsDir: string = join(__dirname, '../data/sessions');
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }
  }
}

export default App;
