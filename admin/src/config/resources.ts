import { HighlightedText } from '@components/highlighted-text/highlighted-text.component';
import { AdminUser, CreateUserDto, UpdateUserDto } from '@data-contracts/backend/data-contracts';
import { Resource } from '@interfaces/resource';
import { apiClient as apiService } from '@services/api-client';
import { createElement } from 'react';

// `groups` and `citizenIdentifier` are not top-level fields — they're SAML
// attributes. Returns '' (empty cell) when the user has no such attribute.
const getAttribute = (user: AdminUser, key: string) =>
  user.attributes?.find((attribute) => attribute.key === key)?.value ?? '';

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
  columns: [
    { property: 'username' },
    { property: 'name' },
    {
      property: 'citizenIdentifier',
      isColumnSortable: false,
      renderColumn: (_value, item) =>
        createElement(HighlightedText, null, getAttribute(item as AdminUser, 'citizenIdentifier')),
    },
    {
      property: 'groups',
      isColumnSortable: false,
      renderColumn: (_value, item) => createElement(HighlightedText, null, getAttribute(item as AdminUser, 'groups')),
    },
  ],
};

const resources = { users };

export default resources;
