import { ApiResponse, handleError } from '@services/api-service';
import type { AxiosError } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Api service', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/dashboard');
  });

  it.each([
    {
      name: 'an unauthorized response',
      error: {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
        config: {},
      },
    },
    {
      name: 'a server error',
      error: {
        response: {
          status: 500,
          data: {
            message: 'Server Error',
          },
        },
        config: {},
      },
    },
    {
      name: 'a network error without response data',
      error: {
        request: {},
        message: 'Network Error',
        config: {},
      },
    },
  ])('rethrows $name', ({ error }) => {
    expect(() => handleError(error as AxiosError<ApiResponse>)).toThrow();
  });
});
