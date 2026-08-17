import { User } from '@data-contracts/backend/data-contracts';
import { ApiResponse, apiService } from './api-service';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const loginAdmin = (credentials: AdminCredentials) =>
  apiService.post<ApiResponse<User>>('admin-auth/login', credentials);

export const logoutAdmin = () => apiService.post<ApiResponse<null>>('admin-auth/logout', {});
