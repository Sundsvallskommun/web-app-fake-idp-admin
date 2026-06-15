import { Api } from '@data-contracts/backend/Api';

// NEXT_PUBLIC_API_PATH is the API root path INCLUDING any public sub-path prefix
// (e.g. "/idp2/api"; "/api" in the default layout). The generated Api methods already
// hardcode the "/api" segment in every request path, so this client's baseURL must be
// origin + the PREFIX portion only (everything before the trailing "/api"). Without this,
// CRUD requests drop the prefix and hit <origin>/api/* instead of <origin>/idp2/api/*
// when the stack is served under a sub-path. The bespoke api-service.ts layer already
// handles the prefix via api-url.ts; this brings the generated client in line.
const apiPath = process.env.NEXT_PUBLIC_API_PATH ?? '/api';
const apiPrefix = apiPath.replace(/\/api\/?$/, '');

/**
 * Shared, pre-configured instance of the generated backend API client.
 * Used by the resource registry and by custom pages that need the concrete
 * generated request/response types (e.g. the users editor).
 */
export const apiClient = new Api({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? ''}${apiPrefix}`,
  withCredentials: true,
});
