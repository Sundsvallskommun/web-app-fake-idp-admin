import { AdminUser, CreateUserDto, UpdateUserDto } from '@data-contracts/backend/data-contracts';
import { Resource } from '@interfaces/resource';
import { apiClient as apiService } from '@services/api-client';

const users: Resource<AdminUser> = {
  name: 'users',
  // endpoints — the generated client types `id` as string; the Resource contract
  // allows string | number, so we bridge with String(id).
  getOne: (id, params) => apiService.userControllerGetUser(String(id), params),
  getMany: apiService.userControllerGetUsers,
  create: (data, params) => apiService.userControllerCreateUser(data as CreateUserDto, params),
  update: (id, data, params) => apiService.userControllerUpdateUser(String(id), data as UpdateUserDto, params),
  remove: (id, params) => apiService.userControllerRemoveUser(String(id), params),

  defaultValues: {
    name: '',
    username: '',
    password: '',
    attributes: [],
  },
  requiredFields: ['name', 'username', 'password'],
};

const resources = { users };

export default resources;
