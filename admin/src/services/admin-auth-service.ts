import { User } from '@data-contracts/backend/data-contracts';
import { ApiResponse, apiService } from './api-service';
import { resetCsrfToken } from './csrf-service';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const loginAdmin = async (credentials: AdminCredentials) => {
  const response = await apiService.post<ApiResponse<User>>('admin-auth/login', credentials);
  resetCsrfToken();
  return response;
};

export const logoutAdmin = async () => {
  try {
    return await apiService.post<ApiResponse<null>>('admin-auth/logout', {});
  } finally {
    resetCsrfToken();
  }
};
