import { HighlightedText } from '@components/highlighted-text/highlighted-text.component';
import {
  AdminGroup,
  AdminUser,
  CreateGroupDto,
  CreateUserDto,
  UpdateGroupDto,
  UpdateUserDto,
} from '@data-contracts/backend/data-contracts';
import { Resource } from '@interfaces/resource';
import { apiClient as apiService } from '@services/api-client';
import { Boxes, Users } from 'lucide-react';
import { createElement } from 'react';

// `citizenIdentifier` is not a top-level field — it is a SAML attribute.
const getAttribute = (user: AdminUser, key: string) =>
  user.attributes?.find((attribute) => attribute.key === key)?.value ?? '';

const users: Resource<AdminUser> = {
  name: 'users',
  icon: Users,
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
        createElement(HighlightedText, null, getAttribute(item as unknown as AdminUser,'citizenIdentifier')),
    },
    {
      property: 'groups',
      isColumnSortable: false,
      renderColumn: (_value, item) =>
        createElement(
          HighlightedText,
          null,
          (item as unknown as AdminUser).groups.map((group) => group.name).join(',')
        ),
    },
  ],
};

const groups: Resource<AdminGroup, CreateGroupDto, UpdateGroupDto> = {
  name: 'groups',
  icon: Boxes,
  getOne: (id, params) => apiService.groupControllerGetGroup(Number(id), params),
  getMany: apiService.groupControllerGetGroups,
  create: ({ name, description }, params) => apiService.groupControllerCreateGroup({ name, description }, params),
  update: (id, { name, description }, params) =>
    apiService.groupControllerUpdateGroup(Number(id), { name, description }, params),
  remove: (id, params) => apiService.groupControllerRemoveGroup(Number(id), params),
  defaultValues: { name: '', description: '' },
  requiredFields: ['name'],
  formFields: ['name', 'description'],
  // Beskrivningen är gruppens dokumentation (roll? organisationstillhörighet?
  // ren testdata?) — ge den en flerradig yta att skrivas i.
  multilineFields: ['description'],
  columns: [{ property: 'name' }, { property: 'description' }, { property: 'userCount' }],
};

const resources = { users, groups };

export default resources;
