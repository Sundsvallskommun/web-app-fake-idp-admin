import { Api } from '@data-contracts/backend/Api';

/**
 * Shared, pre-configured instance of the generated backend API client.
 * Used by the resource registry and by custom pages that need the concrete
 * generated request/response types (e.g. the users editor).
 */
export const apiClient = new Api({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true });
