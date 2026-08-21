import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_EXPIRED_EVENT, handleApiError } from './api-client';

describe('admin API authentication expiry', () => {
  afterEach(() => vi.restoreAllMocks());

  it('surfaces a 401 to LoginGuard and still rejects the request', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    const error = new AxiosError('Unauthorized');
    error.response = {
      data: { message: 'NOT_AUTHORIZED' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    await expect(handleApiError(error)).rejects.toBe(error);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});
