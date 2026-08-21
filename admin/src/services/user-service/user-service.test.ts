import { apiClient } from '@services/api-client';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserStore } from './user-service';

vi.mock('@services/api-client', () => ({
  apiClient: { userControllerGetMe: vi.fn() },
}));

const getMeMock = vi.mocked(apiClient.userControllerGetMe);
const requestError = (status?: number) => {
  const error = new AxiosError('Request failed');
  if (status) {
    error.response = {
      data: { message: 'NOT_AUTHORIZED' },
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }
  return error;
};

describe('admin authentication state', () => {
  beforeEach(() => {
    getMeMock.mockReset();
    useUserStore.getState().reset();
  });

  it('distinguishes an expired session from a backend connection failure', async () => {
    getMeMock.mockRejectedValueOnce(requestError(401));
    await useUserStore.getState().getMe();
    expect(useUserStore.getState().status).toBe('unauthenticated');

    useUserStore.getState().reset();
    getMeMock.mockRejectedValueOnce(requestError());
    await useUserStore.getState().getMe();
    expect(useUserStore.getState()).toMatchObject({ status: 'error', error: 'ADMIN_CONNECTION_FAILED' });
  });

  it('stores the authenticated operator after a successful check', async () => {
    getMeMock.mockResolvedValueOnce({
      data: { data: { name: 'Admin', username: 'admin' }, message: 'success' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

    await useUserStore.getState().getMe();
    expect(useUserStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { name: 'Admin', username: 'admin' },
      error: undefined,
    });
  });
});
