# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a multi-app starter template (Sundsvalls kommun "web-app-starter") with three independent Yarn packages, each with its own `package.json`, `tsconfig.json`, `.env`, and `node_modules`:

- `backend/` — TypeScript + Express + `routing-controllers` API server. Owns the local test-identity catalogue, handles SAML auth + sessions, and exposes a Swagger doc.
- `frontend/` — Public-facing Next.js 16 / React 19 app.
- `admin/` — Next.js 16 / React 19 admin UI with config-driven auto-CRUD (the most actively developed package; see below).

There is no root-level package manager — `cd` into the package you're working on. Node 24 LTS, Yarn.

## SAML IdP role

The backend plays two SAML roles. As a **Service Provider** it *consumes* SAML to log users into the app (passport-saml / `@node-saml/passport-saml` strategy, raw routes registered inline in `backend/src/app.ts` under `/api/saml/*` — login, login/callback (ACS), logout, logout/callback, metadata). It also doubles as a fake **Identity Provider**: it *issues* signed SAML assertions for users in the Prisma store (`User` + `Attribute`), which lets it replace the standalone `web-app-fake-sso-idp`. The IdP routes are mounted under `/api/saml/idp/*` (module: `backend/src/saml-idp/`, wired in `idp.routes.ts`; assertion signing/XML logic lives in `response-builder.ts`, `assertion-template.ts`, `idp-metadata.ts`).

The IdP test-identity store is a local **SQLite** DB (`backend/data/database/database.db`, Prisma). It is the canonical runtime owner of users, attributes, groups, applications, and memberships. `User.password` is plaintext by design (test/simulator). Seed it with `yarn prisma:seed` (imports the repo-root `users.js`) or manage identities through the admin UI. `users.js` is only a seed/legacy-import format; live changes are never written back to disk. Full backup/export uses the versioned JSON format in `backend/src/user-store/user-backup.ts`. The admin operator is configured separately with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_DISPLAY_NAME` and uses its own session cookie.

The old standalone fake-idp served its routes at the root (governed by `BASEPATH`, default `/`). New equivalents:

| Old fake-idp | New backend | Purpose |
|---|---|---|
| `GET /sso` | `GET /api/saml/idp/sso` | SSO, HTTP-Redirect binding |
| `POST /sso` | `POST /api/saml/idp/sso` | SSO, HTTP-POST binding |
| `POST /authenticate` | `POST /api/saml/idp/authenticate` | Validate creds → post signed assertion |
| `GET /` | `GET /api/saml/idp/login` | Select or inspect the persistent IdP test identity |
| `GET /logout` | `POST /api/saml/idp/logout` | Clear only the IdP test identity session |
| *(none)* | `GET /api/saml/idp/metadata` | **New** — IdP metadata for SP config |
| *(none)* | `GET /api/saml/test` | **New** — local SP result/test page |

Notes: the old root `/` becomes `/login` (the `/api/saml/idp` prefix already namespaces the IdP, and a bare `/` would collide with the app root). The selected identity is stored as `idpIdentityId` in the SAML session and is reused for SSO until `POST /logout`; it never authorizes the admin API. The old `pure-min.css` static asset has no equivalent (the pages inline their CSS); assertions are signed with SHA-1 for parity with the original (this is a test/simulator IdP). New env vars: `SAML_IDP_PRIVATE_KEY`, `SAML_IDP_ENTITY_ID`, `SAML_SP_AUDIENCE`, `SAML_IDP_ENUMERATE_USERS`, `ADMIN_URL`, plus the existing `SAML_IDP_PUBLIC_CERT` reused as the IdP's own signing cert.

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
