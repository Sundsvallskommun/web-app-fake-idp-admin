import { apiClient } from './api-client';
import { resetCsrfToken } from './csrf-service';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const loginAdmin = async (credentials: AdminCredentials) => {
  const response = await apiClient.adminAuthControllerLogin(credentials);
  resetCsrfToken();
  return response;
};

export const logoutAdmin = async () => {
  try {
    return await apiClient.adminAuthControllerLogout();
  } finally {
    resetCsrfToken();
  }
};
