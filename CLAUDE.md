# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a multi-app starter template (Sundsvalls kommun "web-app-starter") with three independent Yarn packages, each with its own `package.json`, `tsconfig.json`, `.env`, and `node_modules`:

- `backend/` — TypeScript + Express + `routing-controllers` API server. Acts as a BFF/proxy in front of WSO2 microservices, handles SAML auth + sessions, exposes a Swagger doc.
- `frontend/` — Public-facing Next.js 16 / React 19 app.
- `admin/` — Next.js 16 / React 18 admin UI with config-driven auto-CRUD (the most actively developed package; see below).

There is no root-level package manager — `cd` into the package you're working on. Node >= 20 LTS, Yarn.

## SAML IdP role

The backend plays two SAML roles. As a **Service Provider** it *consumes* SAML to log users into the app (passport-saml / `@node-saml/passport-saml` strategy, raw routes registered inline in `backend/src/app.ts` under `/api/saml/*` — login, login/callback (ACS), logout, logout/callback, metadata). It also doubles as a fake **Identity Provider**: it *issues* signed SAML assertions for users in the Prisma store (`User` + `Attribute`), which lets it replace the standalone `web-app-fake-sso-idp`. The IdP routes are mounted under `/api/saml/idp/*` (module: `backend/src/saml-idp/`, wired in `idp.routes.ts`; assertion signing/XML logic lives in `response-builder.ts`, `assertion-template.ts`, `idp-metadata.ts`).

The IdP user store is a local **SQLite** DB (`backend/data/database/database.db`, Prisma). `User.password` is plaintext by design (test/simulator). Seed it with `yarn prisma:seed` (imports the repo-root `users.js`) or create/update a single admin user interactively with `yarn create-admin` (prompts for the required SAML attributes: `givenName`, `surname`, `citizenIdentifier`, `username`, `groups`).

The old standalone fake-idp served its routes at the root (governed by `BASEPATH`, default `/`). New equivalents:

| Old fake-idp | New backend | Purpose |
|---|---|---|
| `GET /sso` | `GET /api/saml/idp/sso` | SSO, HTTP-Redirect binding |
| `POST /sso` | `POST /api/saml/idp/sso` | SSO, HTTP-POST binding |
| `POST /authenticate` | `POST /api/saml/idp/authenticate` | Validate creds → post signed assertion |
| `GET /` | `GET /api/saml/idp/login` | Homepage: login form, or details if logged in |
| `POST /` | `POST /api/saml/idp/login` | Log in at homepage (no AuthnRequest) |
| `GET /logout` | `GET /api/saml/idp/logout` | Clear IdP session, redirect to RelayState/login |
| *(none)* | `GET /api/saml/idp/metadata` | **New** — IdP metadata for SP config |

Notes: the old root `/` becomes `/login` (the `/api/saml/idp` prefix already namespaces the IdP, and a bare `/` would collide with the app root); the old `pure-min.css` static asset has no equivalent (the pages inline their CSS); assertions are signed with SHA-1 for parity with the original (this is a test/simulator IdP). New env vars: `SAML_IDP_PRIVATE_KEY`, `SAML_IDP_ENTITY_ID`, `SAML_SP_AUDIENCE`, `SAML_IDP_ENUMERATE_USERS`, plus the existing `SAML_IDP_PUBLIC_CERT` reused as the IdP's own signing cert.

## Commands

Run inside the relevant package directory.

**admin / frontend (Next.js):**
- `yarn dev` — dev server (admin defaults to `PORT=3002`, frontend `3000`)
- `yarn build` / `yarn start`
- `yarn lint` — `next lint --no-cache`
- `yarn type-check` — `tsc --noEmit` (frontend only; admin uses `next build`/editor for types)
- `yarn generate:contracts` — regenerate API data-contracts from the backend's live Swagger (requires backend running; see below)
- `yarn cypress` — open Cypress (frontend also has `cypress:headless`, `jest`, `jest:coverage`)

**frontend tests (jest):** `yarn jest` (watch), `yarn jest:coverage`. Run a single test: `yarn jest path/to/file.test.tsx -t "test name"`. Jest only collects from `src/services/**` and `src/components/**`, and `testRegex` excludes `.spec.` files (those are Cypress). admin has the same jest setup with a single example test under `src/services/__tests__`.

**backend:**
- `yarn dev` — nodemon (defaults to port `3001` via docker mapping)
- `yarn build` (`tsc && tsc-alias`), `yarn test` (jest), `yarn lint` / `yarn lint:fix`, `yarn type-check`
- `yarn prisma:generate` / `yarn prisma:migrate` — DB setup; `yarn prisma:seed` — seed users from root `users.js`; `yarn create-admin` — interactive admin-user creation (see SAML IdP role above)
- `yarn generate:contracts` — pull data models from the upstream WSO2 APIs listed in `src/config/api-config.ts`
- Entry: `src/server.ts` → `App` (`src/app.ts`) wires middleware then mounts SAML SP routes, IdP routes, and routing-controllers at `BASE_URL_PREFIX` (`/api`), in that order.

**Docker:** `cp .env.example .env` (paste a signing keypair — the only required secret), then `docker compose up --build`. See **Deployment topology** below — this is the intended way to run the full stack.

## Deployment topology (Docker stack)

The whole point of the stack is to be self-referential and same-origin (see the long header comments in `docker-compose.yml` + `.env.example`, which are the authoritative reference):

- **Three services:** `backend` (port `7000`, direct — Swagger/debug), `admin` (internal-only, `expose: 3000`), and an nginx `proxy` (`nginx.conf.template`) published on `ADMIN_PORT` (`7001`) as the **single browser entry point**. `frontend` is commented out. Browse the app at the proxy, not the admin/backend ports.
- **Why the proxy exists:** it serves the admin UI and the backend API under one origin, so admin→API calls are same-origin and the SAML session cookie is first-party. Hitting the admin/backend ports directly causes cross-site-cookie **401s** and broken SAML redirects (this is the recurring trap; the recent "routing/paths/subpaths" commits are about getting it right).
- **Self-referential SAML:** the SP role points at this same backend's IdP role; both are signed with the **one** keypair in `.env` (`SAML_IDP_PRIVATE_KEY` / `SAML_IDP_PUBLIC_CERT` — there is no separate SP keypair). All browser-facing SP/IdP URLs are composed from `BASE_URL` + `ADMIN_PORT` (the proxy origin).
- **Env split:** the root `.env` is read by Docker **only** for `${VAR}` interpolation in compose; runtime config is set inline in `docker-compose.yml`. `yarn dev` instead uses the per-package `.env.*.local` files and ignores root `.env`.
- **Sub-path / basePath:** the stack can be served under a public prefix. `PUBLIC_PREFIX` (e.g. `/idp2`) prefixes the API + IdP; `ADMIN_BASE_PATH` (e.g. `/idp2/admin`) is the Next.js `basePath`. Both are **inlined into the admin build**, so changing them requires `--build`. The same `nginx.conf.template` serves both the default-root and prefixed layouts via envsubst.
- **Own reverse proxy:** `docker-compose.external-proxy.yml` is a NON-auto-loaded overlay for fronting the stack with your own proxy (Apache, etc.) on a different origin/IP; it rebases browser-facing URLs onto `PUBLIC_ORIGIN` and disables the bundled nginx. Run with `docker compose -f docker-compose.yml -f docker-compose.external-proxy.yml up -d --build`.
- **DB persistence:** SQLite lives on the named volume `backend-data` and survives `up --build`/`down` (only `down -v` wipes it). Docker does **not** seed — populate via the admin UI (add users, or the "Import users" button on `/users`).

## Data-contract generation (important)

API client types are **generated, not hand-written**. `src/swagger-typescript-api.ts` (in `admin` and `frontend`) curls `${NEXT_PUBLIC_API_URL}${NEXT_PUBLIC_API_PATH}/swagger.json` from the running backend and runs `swagger-typescript-api --modular --axios --clean-output` into `src/data-contracts/backend/` (`Api.ts`, `data-contracts.ts`, `http-client.ts`). So: start the backend first, then run `yarn generate:contracts`. Do not hand-edit files under `src/data-contracts/` — they are overwritten.

## admin architecture (config-driven CRUD)

The admin UI auto-generates list/edit/create pages from a single resource config. Read these together to understand it:

- **`src/config/resources.ts`** — the central registry. Each resource maps a key to a `Resource<T>` object whose `getOne/getMany/create/update/remove` point at generated `Api` methods. **The object key, the `name` field, and the i18n namespace filename must all be identical** (e.g. `users`).
- **`src/interfaces/resource.ts` + `resource-services.ts`** — the `Resource<T>` shape the generated API methods are expected to match (`GetOne/GetMany/Create/Update/Remove` signatures). When a generated endpoint's signature doesn't line up (as with the current `users` resource), `resources.ts` uses `@ts-expect-error` annotations — these mark integration points where a backend endpoint must be created/adapted, not bugs to silently delete.
- **`src/pages/[resource]/index.tsx`** (list) and **`[id].tsx`** (edit; `id === 'new'` means create) — generic pages keyed off the dynamic `[resource]` route. `stringToResourceName` validates the URL segment against the registry and redirects to `/` if unknown. List columns are derived by reflecting over primitive (string/number/boolean) fields of the first data row.
- **`src/utils/use-resource.ts`** — fetches `getMany`, caches list state in a Zustand store (`use-localstorage.hook.ts`).
- **`src/utils/use-crud-helpers.ts`** — wraps each CRUD call with snackbar success/error toasts (messages come from the `crud` i18n namespace).
- **`src/components/edit-resource/`** — recursively renders the edit form from react-hook-form values, branching on input/object/array field types.

To add a resource without the automation, create `src/pages/<resource>/{index,[id],new}.tsx` manually (see `admin/README.md`).

### Two HTTP layers in admin
- Generated `Api` class (`data-contracts/backend/`) — used by the resource registry for CRUD; configured with `baseURL: NEXT_PUBLIC_API_URL`, `withCredentials: true`.
- `src/services/api-service.ts` — a separate thin axios wrapper (`get/post/put/patch/delete`) used for bespoke calls like the user/auth store (`src/services/user-service/`). Its `handleError` redirects to `/login` on 401. `apiURL()` prefixes `NEXT_PUBLIC_API_URL + NEXT_PUBLIC_API_PATH`.

### Auth
`LoginGuard` (`src/components/login-guard/`) calls `getMe()` on mount and renders a fullscreen loader until resolved; unauthenticated users (no `user.name`) outside `/login` are held. Commented-out blocks show the pattern for per-route permission gating.

## i18n (next-i18next)

This section describes **admin** (file-based `next-i18next`). The **frontend** package instead uses `next-i18n-router` (App Router, dynamic translations) and has no `public/locales` directory — don't apply the rules below there.

Locale files live in `public/locales/<locale>/<namespace>.json` (default locale `sv`, configured in `next-i18next.config.js`). **Every page-level component must export `getServerSideProps` passing the needed namespaces through `serverSideTranslations`** — including `...Object.keys(resources)` so each resource's namespace loads. In admin, a resource's namespace file provides pluralized display names (`name_one/name_many/...`) and a `properties` map for field labels (nested objects use a `DEFAULT` key). `react-refresh/only-export-components` is configured to allow the `getServerSideProps` named export.

## Conventions

- Path aliases (`@components/*`, `@interfaces/*`, `@utils/*`, `@config/*`, `@data-contracts/*`, etc.) are defined in each package's `tsconfig.json` and mirrored in `jest.config.js` `moduleNameMapper` — update both when adding one.
- `@typescript-eslint/no-explicit-any` is an **error** in admin; existing `any` usages carry explicit `eslint-disable` comments.
- UI is built on the `@sk-web-gui` component library and Tailwind.
- Line endings may differ between Windows/Linux checkouts — ignore pure EOL diffs.
