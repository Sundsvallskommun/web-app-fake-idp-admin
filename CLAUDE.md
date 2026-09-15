# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a multi-app starter template (Sundsvalls kommun "web-app-starter") with three independent Yarn packages, each with its own `package.json`, `tsconfig.json`, `.env`, and `node_modules`:

- `backend/` — TypeScript + Express + `routing-controllers` API server. Owns the local test-identity catalogue, handles SAML auth + sessions, and exposes a Swagger doc.
- `frontend/` — Public-facing Next.js 16 / React 19 app.
- `admin/` — Next.js 16 / React 19 admin UI with config-driven auto-CRUD (the most actively developed package; see below).

There is no root-level package manager — `cd` into the package you're working on. Node 24 LTS, Yarn.

## SAML IdP role

The backend plays two SAML roles. As a **Service Provider** it *consumes* SAML to log users into the app (passport-saml / `@node-saml/passport-saml` strategy, raw routes registered inline in `backend/src/app.ts` under `/api/saml/*` — login, login/callback (ACS), logout, logout/callback, metadata). It also doubles as a fake **Identity Provider**: it *issues* signed SAML assertions for users in the Prisma store (`User` + `Attribute`), which lets it replace the standalone `web-app-fake-sso-idp`. The SAML-specific IdP routes (`sso`, `metadata`) are mounted under `/api/saml/idp/*`; the identity picker (`login`/`authenticate`/`logout`) is shared with the OIDC role and lives canonically on the protocol-neutral `/api/idp/*`, with `/api/saml/idp/login|authenticate|logout` kept as aliases (module: `backend/src/saml-idp/`, wired in `idp.routes.ts`; assertion signing/XML logic lives in `response-builder.ts`, `assertion-template.ts`, `idp-metadata.ts`).

The IdP test-identity store is a local **SQLite** DB (`backend/data/database/database.db`, Prisma). It is the canonical runtime owner of users, attributes, groups, applications, and memberships. `User.password` is plaintext by design (test/simulator). Seed it with `yarn prisma:seed` (imports the repo-root `users.js`) or manage identities through the admin UI. `users.js` is only a seed/legacy-import format; live changes are never written back to disk. Full backup/export uses the versioned JSON format in `backend/src/user-store/user-backup.ts`. The admin operator is configured separately with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_DISPLAY_NAME` and uses its own session cookie.

The old standalone fake-idp served its routes at the root (governed by `BASEPATH`, default `/`). New equivalents:

| Old fake-idp | New backend | Purpose |
|---|---|---|
| `GET /sso` | `GET /api/saml/idp/sso` | SSO, HTTP-Redirect binding |
| `POST /sso` | `POST /api/saml/idp/sso` | SSO, HTTP-POST binding |
| `POST /authenticate` | `POST /api/idp/authenticate` (alias: `/api/saml/idp/authenticate`) | Validate creds → post signed assertion |
| `GET /` | `GET /api/idp/login` (alias: `/api/saml/idp/login`) | Select or inspect the persistent IdP test identity |
| `GET /logout` | `GET`/`POST /api/idp/logout` (alias: `/api/saml/idp/logout`) | Clear only the IdP test identity session |
| *(none)* | `GET /api/saml/idp/metadata` | **New** — IdP metadata for SP config |
| *(none)* | `GET /api/saml/test` | **New** — local SP result/test page |

Notes: the old root `/` becomes `/login` (the `/api/saml/idp` prefix already namespaces the IdP, and a bare `/` would collide with the app root). The selected identity is stored as `idpIdentityId` in the SAML session and is reused for SSO until logout; it never authorizes the admin API. Logout is exposed on both verbs: `POST /logout` is the IdP page's own CSRF-protected form, while `GET /logout?RelayState=<absolute url>` exists for **external** SPs — they cannot hold a synchronizer token, and csrf-sync only guards state-changing methods, so the GET passes without loosening the allowlist in `csrf.middleware.ts`. `RelayState` is validated with `isValidUrl` only (no origin allow-list) so any SP can use the shared test IdP without being added to `ORIGIN`. `GET /api/saml/logout` (SP role) also clears `idpIdentityId`, since both roles share one session — otherwise the next login silently re-issues an assertion. The old `pure-min.css` static asset has no equivalent (the pages inline their CSS); assertions are signed with SHA-1 for parity with the original (this is a test/simulator IdP). New env vars: `SAML_IDP_PRIVATE_KEY`, `SAML_IDP_ENTITY_ID`, `SAML_SP_AUDIENCE`, `SAML_IDP_ENUMERATE_USERS`, `ADMIN_URL`, plus the existing `SAML_IDP_PUBLIC_CERT` reused as the IdP's own signing cert.

## OIDC OpenID Provider role

Alongside SAML, the backend issues OpenID Connect tokens for the same test identities. Module: `backend/src/oidc-idp/`, mounted under `/api/oidc/*` (wired in `oidc.routes.ts` from `app.ts`). Only **authorization code + PKCE** is implemented; implicit, hybrid, refresh tokens, dynamic registration and revocation are deliberately absent and are not advertised in discovery.

| Endpoint | Purpose |
|---|---|
| `GET /api/oidc/.well-known/openid-configuration` | Discovery. Lives below the issuer, so an RP library's default `issuer + /.well-known/...` resolves. Served **only** on the issuer's host — any other host (e.g. the backend's direct port) gets a 404 naming the canonical URL, since a conformant RP (RFC 8414) would otherwise hard-fail on issuer mismatch. |
| `GET /api/oidc/jwks.json` | Signing key (RSA, RS256). `kid` is the RFC 7638 JWK thumbprint. |
| `GET /api/oidc/authorize` | Parks the request in the session, then reuses or prompts for a test identity. |
| `POST /api/oidc/token` | Back-channel code exchange. `client_secret_basic`, `client_secret_post` or PKCE-only. |
| `GET`/`POST /api/oidc/userinfo` | Claims for a bearer access token. |
| `POST /api/oidc/introspect` | RFC 7662 introspection for resource servers (client-authenticated). Storeless tokens: "active" = signature + issuer + expiry; no early revocation. |
| `GET /api/oidc/end-session` | RP-initiated logout. |
| `GET /api/oidc/test` | **Local test Relying Party** — the OIDC counterpart of `/api/saml/test`. |

Key facts:

- **One keypair, two protocols.** The OP signs with `SAML_IDP_PRIVATE_KEY`/`SAML_IDP_PUBLIC_CERT` — the same pair the SAML role uses. SAML keeps SHA-1 for parity with the original fake-sso-idp; JWTs are RS256.
- **One session, one identity.** `/authorize` redirects to the shared picker at `/api/idp/login` (protocol-neutral, so an OIDC login never appears to detour into `/api/saml/*`; the SAML-era path remains an alias); `session.idpRequest` is a **tagged union** (`protocol: 'saml' | 'oidc'`) so the one `/authenticate` handler can finish either flow. Logging out anywhere clears `idpIdentityId` for both roles.
- **The client registry is the security boundary.** SAML needs none (an AuthnRequest names its own ACS URL), but OIDC has no signed request, so `OidcClient` (Prisma) holds exact-match `redirectUris`. An unregistered `redirect_uri` or unknown `client_id` is reported **on screen**, never redirected to. `clientSecret` is plaintext by design, like `User.password`.
- **Storeless tokens.** Access tokens are JWTs so `/userinfo` validates by signature; only authorization codes are kept server-side (in-memory, single-use, short TTL). Issued tokens therefore cannot be revoked before expiry — hence no revocation endpoint.
- **Claims mirror the assertion.** `claims.ts` maps SAML attribute keys onto standard claims (`givenName`→`given_name`, LDAP OIDs, …) and passes everything else through verbatim, so `citizenIdentifier` survives. `groups` is emitted as a JSON **array** (SAML sends CSV). Scopes gate only the standard claim groups; `groups` and custom attributes are always present.
- **Issuer.** `OIDC_ISSUER` defaults to the `SAML_IDP_ENTITY_ID` origin + `PUBLIC_PREFIX` + `/api/oidc`, so it is correct in the bundled *and* external-proxy topologies with no extra configuration. Optional env: `OIDC_ISSUER`, `OIDC_ID_TOKEN_TTL`, `OIDC_ACCESS_TOKEN_TTL`, `OIDC_CODE_TTL`.
- **Managed from the admin UI.** `oidc-clients` is a normal entry in the config-driven registry (`admin/src/config/resources.ts`, namespace `public/locales/sv/oidc-clients.json`); the generic form renders the booleans as switches and the URI lists as add/remove rows, so no bespoke page was needed. `client_id` is validated against a conservative character set and the built-in test client's id is reserved. The user edit page shows a **claims preview** (`GET /users/:id/claims-preview`) beside the existing SAML assertion preview — same masking, and the two side by side are how you see that `groups` is an array here and a CSV string there.
- **The loop tests itself.** `GET /api/oidc/test` is a real RP in this same process: it runs authorization code + PKCE against this OP, exchanges the code over HTTP at `/token`, and verifies the ID token against the key published in `/jwks.json` — not against the in-process signing key, so a broken JWKS actually fails the test. Its client (`fake-idp-local-test`) is **built in** (`local-client.ts`), resolved ahead of the database so the loop works on a freshly created DB; an admin-created row with the same `client_id` cannot shadow it.
- **Two base URLs.** The test RP's back-channel calls go to `OIDC_INTERNAL_URL` (default `http://127.0.0.1:$PORT/api/oidc`). Inside a container the public host/port is the browser's view of the proxy and is not reachable from the backend — the same split a real RP behind a proxy has to make.
- **The test page is origin-agnostic.** Every URL it emits is derived from the incoming request (`req.baseUrl` + `Host`), not from the issuer origin, so it works on the proxy port *and* on the backend container's own published port, prefixed or bare, under whatever hostnames the operator's hosts file points at the stack (`idp.test`, `dev.test`, `localhost`, …). The built-in client's redirect URIs are therefore resolved per browsing origin; the fixed part is the PATH, which is always this app's own test callback, so it cannot become an open redirect — and this applies to the built-in client only, never to database-registered ones. Only the discovery URL shown on the page stays canonical, since that is what an external client must be pointed at.
- **Middleware exceptions.** `/api/oidc` joins the SAML paths in `app.ts`'s `idpPaths`, so it gets the `fake-idp.sid` session (the admin cookie is `sameSite: 'strict'` and would be dropped on the redirect back from an RP) and opts out of the app-wide CORS middleware — the OIDC endpoints set their own permissive CORS instead. `POST /api/oidc/token` and `POST /api/oidc/userinfo` are in the CSRF allowlist because they are server-to-server calls with no cookie.


## Commands

Run inside the relevant package directory.

**admin / frontend (Next.js):**
- `yarn dev` — dev server (admin defaults to `PORT=3002`, frontend `3000`)
- `yarn build` / `yarn start`
- `yarn lint` — ESLint
- `yarn type-check` — type-check application and Vitest/Playwright configs
- `yarn generate:contracts` — regenerate API data-contracts from the backend's live Swagger (requires backend running; see below)
- `yarn test` / `yarn test:watch` / `yarn test:coverage` — Vitest
- Frontend only: `yarn test:e2e` / `yarn test:e2e:ui` — Playwright

**Frontend tests:** Vitest owns unit tests under `frontend/vitest/`. Playwright owns browser flows under `frontend/playwright/`; install its Chromium runtime once with `yarn playwright install chromium`.

**backend:**
- `yarn dev` — nodemon (defaults to port `3001` via docker mapping)
- `yarn build` (`tsc && tsc-alias`), `yarn test` (Vitest), `yarn lint` / `yarn lint:fix`, `yarn type-check`
- `yarn prisma:generate` / `yarn prisma:migrate` — DB setup; `yarn prisma:seed` — seed test identities from root `users.js`
- Entry: `src/server.ts` → `App` (`src/app.ts`) wires middleware then mounts SAML SP routes, IdP routes, and routing-controllers at `BASE_URL_PREFIX` (`/api`), in that order.

**Docker:** `cp .env.example .env` (paste a signing keypair — the only required secret), then `docker compose up --build`. See **Deployment topology** below — this is the intended way to run the full stack.

## Deployment topology (Docker stack)

The whole point of the stack is to be self-referential and same-origin (see the long header comments in `docker-compose.yml` + `.env.example`, which are the authoritative reference):

- **Three services:** `backend` (port `7000`, direct — Swagger/debug), `admin` (internal-only, `expose: 3000`), and an nginx `proxy` (`nginx.conf.template`) published on `ADMIN_PORT` (`7001`) as the **single browser entry point**. `frontend` is commented out. Browse the app at the proxy, not the admin/backend ports.
- **Why the proxy exists:** it serves the admin UI and the backend API under one origin, so admin→API calls and the admin session cookie are same-origin. Browse the app through the proxy.
- **Self-referential SAML:** the SP role points at this same backend's IdP role; both are signed with the **one** keypair in `.env` (`SAML_IDP_PRIVATE_KEY` / `SAML_IDP_PUBLIC_CERT` — there is no separate SP keypair). All browser-facing SP/IdP URLs are composed from `BASE_URL` + `ADMIN_PORT` (the proxy origin).
- **Separate user contexts:** `fake-idp.sid` owns the selected test identity and local SP session; `fake-idp-admin.sid` owns the environment-configured admin operator. The local SAML callback lands on `/api/saml/test`, never on the admin login.
- **Mutation protection:** state-changing admin and IdP requests use a synchronizer CSRF token from `GET /api/admin-auth/csrf`; the admin clients attach it automatically. Only the external SAML POST bindings (`/saml/idp/sso` and `/saml/login/callback`) bypass CSRF validation. Admin login and all IdP routes are rate-limited.
- **Env split:** the root `.env` is read by Docker **only** for `${VAR}` interpolation in compose; runtime config is set inline in `docker-compose.yml`. `yarn dev` instead uses the per-package `.env.*.local` files and ignores root `.env`.
- **Sub-path / basePath:** the stack can be served under a public prefix. `PUBLIC_PREFIX` (e.g. `/idp2`) prefixes the API + IdP; `ADMIN_BASE_PATH` (e.g. `/idp2/admin`) is the Next.js `basePath`. Both are **inlined into the admin build**, so changing them requires `--build`. The same `nginx.conf.template` serves both the default-root and prefixed layouts via envsubst.
- **Own reverse proxy:** `docker-compose.external-proxy.yml` is a NON-auto-loaded overlay for fronting the stack with your own proxy (Apache, etc.) on a different origin/IP; it rebases browser-facing URLs onto `PUBLIC_ORIGIN` and disables the bundled nginx. Run with `docker compose -f docker-compose.yml -f docker-compose.external-proxy.yml up -d --build`.
- **DB persistence:** SQLite lives on the named volume `backend-data` and survives `up --build`/`down` (only `down -v` wipes it). Docker does **not** seed — populate via the admin UI (add users, or the "Import users" button on `/users`). Import is a destructive catalogue replacement: the UI first previews the impact, requires a content-bound confirmation token, and downloads a recovery backup before applying it.

## Data-contract generation (important)

API client types are **generated, not hand-written**. `src/swagger-typescript-api.ts` (in `admin` and `frontend`) curls `${NEXT_PUBLIC_API_URL}${NEXT_PUBLIC_API_PATH}/swagger.json` from the running backend and runs `swagger-typescript-api --modular --axios --clean-output` into `src/data-contracts/backend/` (`Api.ts`, `data-contracts.ts`, `http-client.ts`). So: start the backend first, then run `yarn generate:contracts`. Do not hand-edit files under `src/data-contracts/` — they are overwritten.

## admin architecture (config-driven CRUD)

The admin UI auto-generates list/edit/create pages from a single resource config. Read these together to understand it:

- **`src/config/resources.ts`** — the central registry. Each resource maps a key to a `Resource<T>` object whose `getOne/getMany/create/update/remove` point at generated `Api` methods. **The object key, the `name` field, and the i18n namespace filename must all be identical** (e.g. `users`).
- **`src/interfaces/resource.ts` + `resource-services.ts`** — the `Resource<T>` shape the generated API methods are expected to match (`GetOne/GetMany/Create/Update/Remove` signatures). When a generated endpoint's signature doesn't line up (as with the current `users` resource), `resources.ts` uses `@ts-expect-error` annotations — these mark integration points where a backend endpoint must be created/adapted, not bugs to silently delete.
- **`src/pages/[resource]/index.tsx`** (list) and **`[id].tsx`** (edit; `id === 'new'` means create) — generic pages keyed off the dynamic `[resource]` route. `stringToResourceName` validates the URL segment against the registry and redirects to `/` if unknown. List columns are derived by reflecting over primitive (string/number/boolean) fields of the first data row.
- **`src/utils/use-resource.ts`** — fetches `getMany` and keeps list state in a Zustand store. `use-localstorage.hook.ts` persists only UI preferences; API resource data deliberately stays in memory and is reset on logout.
- **`src/utils/use-crud-helpers.ts`** — wraps each CRUD call with snackbar success/error toasts (messages come from the `crud` i18n namespace).
- **`src/components/edit-resource/`** — recursively renders the edit form from react-hook-form values, branching on input/object/array field types.

To add a resource without the automation, create `src/pages/<resource>/{index,[id],new}.tsx` manually (see `admin/README.md`).

### HTTP ownership in admin
`src/services/api-client.ts` owns the single generated `Api` instance for CRUD, auth, imports, exports, and bespoke user flows. It configures the API prefix, credentials, CSRF attachment, and the shared 401/session-expiry signal. Do not add a parallel axios wrapper. The direct axios call in `csrf-service.ts` is the intentionally isolated bootstrap request that obtains the token before interceptors can attach it.

### Auth
`LoginGuard` (`src/components/login-guard/`) owns explicit `idle`, `loading`, `authenticated`, `unauthenticated`, and `error` states. Connection failures render a retryable error instead of masquerading as logout; a 401 from the shared API client marks the session as expired.

## i18n (next-i18next)

This section describes **admin** (file-based `next-i18next`). The **frontend** package instead uses `next-i18n-router` (App Router, dynamic translations) and has no `public/locales` directory — don't apply the rules below there.

Locale files live in `public/locales/<locale>/<namespace>.json` (default locale `sv`, configured in `next-i18next.config.js`). **Every page-level component must export `getServerSideProps` passing the needed namespaces through `serverSideTranslations`** — including `...Object.keys(resources)` so each resource's namespace loads. In admin, a resource's namespace file provides pluralized display names (`name_one/name_many/...`) and a `properties` map for field labels (nested objects use a `DEFAULT` key). `react-refresh/only-export-components` is configured to allow the `getServerSideProps` named export.

## Conventions

- Path aliases (`@components/*`, `@interfaces/*`, `@utils/*`, `@config/*`, `@data-contracts/*`, etc.) are defined in each package's `tsconfig.json` and mirrored in its `vitest.config.mts` — update both when adding one.
- `@typescript-eslint/no-explicit-any` is an **error** in admin; existing `any` usages carry explicit `eslint-disable` comments.
- UI is built from the local shadcn-compatible component registry (`admin/src/components/ui/`), Radix primitives, and Tailwind.
- Line endings may differ between Windows/Linux checkouts — ignore pure EOL diffs.
