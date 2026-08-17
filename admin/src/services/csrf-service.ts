import { apiURL } from '@utils/api-url';
import axios from 'axios';

interface CsrfResponse {
  data: { token: string };
}

let csrfTokenRequest: Promise<string> | undefined;

export const getCsrfToken = (): Promise<string> => {
  if (!csrfTokenRequest) {
    csrfTokenRequest = axios
      .get<CsrfResponse>(apiURL('/admin-auth/csrf'), { withCredentials: true })
      .then((response) => response.data.data.token)
      .catch((error) => {
        csrfTokenRequest = undefined;
        throw error;
      });
  }

  return csrfTokenRequest;
};

export const resetCsrfToken = (): void => {
  csrfTokenRequest = undefined;
};
