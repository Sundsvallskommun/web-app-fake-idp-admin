import { ApiResponse, handleError } from '@services/api-service';
import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

describe('Api service', () => {
  it('rethrows the API error', () => {
    const error = {
      response: {
        status: 500,
        data: {
          message: 'Server error',
        },
      },
      config: {
        url: 'url',
      },
    };

    expect(() => handleError(error as AxiosError<ApiResponse>)).toThrow();
  });
});
