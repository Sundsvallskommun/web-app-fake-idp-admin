import { HighlightedText } from '@components/highlighted-text/highlighted-text.component';
import { Badge } from '@components/ui/badge';
import {
  AdminApplication,
  AdminGroup,
  AdminOidcClient,
  AdminUser,
  CreateApplicationDto,
  CreateGroupDto,
  CreateOidcClientDto,
  CreateUserDto,
  UpdateApplicationDto,
  UpdateGroupDto,
  UpdateOidcClientDto,
  UpdateUserDto,
} from '@data-contracts/backend/data-contracts';
import { Resource, ResourceColumn } from '@interfaces/resource';
import { apiClient as apiService } from '@services/api-client';
import { AppWindow, Boxes, KeyRound, Users } from 'lucide-react';
import { createElement } from 'react';

/** Så många medlemsbadges får plats innan resten läggs i en "+N"-badge. */
const MEMBER_BADGE_LIMIT = 6;

/**
 * Medlemskolumnen för grupper och applikationer: visar VILKA testidentiteter
 * som hör till raden, inte bara hur många. Sorteringsnyckeln är ändå `userCount`
 * (numerisk), så listan kan öppnas med de mest använda överst utan att antalet
 * behöver en egen kolumn.
 */
const memberColumn = <
  T extends { userCount: number; users: { id: string; name: string; username: string }[] },
>(): ResourceColumn<T> => ({
  property: 'userCount',
  renderColumn: (_value, item) => {
    const members = item.users ?? [];
    if (members.length === 0) {
      return createElement('span', { className: 'text-muted-foreground' }, '–');
    }
    const shown = members.slice(0, MEMBER_BADGE_LIMIT);
    const hidden = members.slice(MEMBER_BADGE_LIMIT);
    return createElement(
      'span',
      { className: 'flex flex-wrap gap-1' },
      ...shown.map((member) =>
        createElement(
          Badge,
          { key: member.id, variant: 'outline', className: 'font-normal', title: member.username },
          createElement(HighlightedText, null, member.name)
        )
      ),
      hidden.length > 0 ?
        createElement(
          Badge,
          {
            key: 'rest',
            variant: 'secondary',
            className: 'font-normal',
            title: hidden.map((member) => member.name).join(', '),
          },
          `+${hidden.length}`
        )
      : null
    );
  },
});

// `citizenIdentifier` is not a top-level field — it is a SAML attribute.
const getAttribute = (user: AdminUser, key: string) =>
  user.attributes?.find((attribute) => attribute.key === key)?.value ?? '';

const namedBadges = (items: Array<{ id: number; name: string }>, variant: 'secondary' | 'outline' = 'secondary') =>
  createElement(
    'span',
    { className: 'flex flex-wrap gap-1' },
    ...items.map((item) =>
      createElement(
        Badge,
        { key: item.id, variant, className: 'font-normal' },
        createElement(HighlightedText, null, item.name)
      )
    )
  );

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
      renderColumn: (_value, item) => createElement(HighlightedText, null, getAttribute(item, 'citizenIdentifier')),
    },
    {
      property: 'groups',
      isColumnSortable: false,
      renderColumn: (_value, item) =>
        createElement(
          HighlightedText,
          null,
          item.groups.map((group) => group.name).join(',')
        ),
    },
    {
      property: 'applications',
      isColumnSortable: false,
      renderColumn: (_value, item) => namedBadges(item.applications),
    },
  ],
};

const groups: Resource<AdminGroup, CreateGroupDto, UpdateGroupDto> = {
  name: 'groups',
  icon: Boxes,
  getOne: (id, params) => apiService.groupControllerGetGroup(Number(id), params),
  getMany: apiService.groupControllerGetGroups,
  create: ({ name, description, applicationIds }, params) =>
    apiService.groupControllerCreateGroup({ name, description, applicationIds }, params),
  update: (id, { name, description, applicationIds }, params) =>
    apiService.groupControllerUpdateGroup(Number(id), { name, description, applicationIds }, params),
  remove: (id, params) => apiService.groupControllerRemoveGroup(Number(id), params),
  defaultValues: { name: '', description: '', applicationIds: [] },
  toForm: (group) => ({ ...group, applicationIds: group.applications.map((application) => application.id) }),
  requiredFields: ['name'],
  formFields: ['name', 'description', 'applicationIds'],
  relationFields: [{ property: 'applicationIds', targetResource: 'applications' }],
  // Beskrivningen är gruppens dokumentation (roll? organisationstillhörighet?
  // ren testdata?) — ge den en flerradig yta att skrivas i.
  multilineFields: ['description'],
  columns: [
    { property: 'name' },
    {
      property: 'description',
      // Beskrivningar uppmuntras vara långa (textarea) — klipp till två rader i
      // listan så tabellen förblir skanningsbar; hela texten syns i redigeringen.
      renderColumn: (value) =>
        createElement('span', { className: 'line-clamp-2' }, createElement(HighlightedText, null, value as string)),
    },
    {
      property: 'applications',
      isColumnSortable: false,
      renderColumn: (_value, item) => namedBadges(item.applications),
    },
    memberColumn<AdminGroup>(),
  ],
  // Grupper som faktiskt används överst — de oanvända är sällan det man letar
  // efter, och skillnaden syns direkt. Kolumnrubrikerna sorterar om fritt.
  defaultSort: { property: 'userCount', desc: true },
};

// Anslutna testapplikationer. Ren verktygsmetadata (aldrig SAML-claims) som
// kopplas till grupper och driver den härledda accessvyn och IdP-filtret.
const applications: Resource<AdminApplication, CreateApplicationDto, UpdateApplicationDto> = {
  name: 'applications',
  icon: AppWindow,
  getOne: (id, params) => apiService.applicationControllerGetApplication(Number(id), params),
  getMany: apiService.applicationControllerGetApplications,
  create: ({ name, description }, params) =>
    apiService.applicationControllerCreateApplication({ name, description }, params),
  update: (id, { name, description }, params) =>
    apiService.applicationControllerUpdateApplication(Number(id), { name, description }, params),
  remove: (id, params) => apiService.applicationControllerRemoveApplication(Number(id), params),
  defaultValues: { name: '', description: '' },
  requiredFields: ['name'],
  formFields: ['name', 'description'],
  multilineFields: ['description'],
  columns: [
    { property: 'name' },
    {
      property: 'description',
      renderColumn: (value) =>
        createElement('span', { className: 'line-clamp-2' }, createElement(HighlightedText, null, value as string)),
    },
    {
      property: 'groups',
      isColumnSortable: false,
      renderColumn: (_value, item) => namedBadges(item.groups, 'outline'),
    },
    memberColumn<AdminApplication>(),
  ],
  defaultSort: { property: 'userCount', desc: true },
};

// Registrerade OIDC-klienter (Relying Parties). SAML behöver ingen motsvarighet —
// en AuthnRequest bär sin egen ACS-URL — men OIDC saknar signerad förfrågan, så
// den här listan ÄR säkerhetsgränsen: `redirectUris` matchas exakt.
const oidcClients: Resource<AdminOidcClient, CreateOidcClientDto, UpdateOidcClientDto> = {
  name: 'oidc-clients',
  icon: KeyRound,
  getOne: (id, params) => apiService.oidcClientControllerGetOidcClient(Number(id), params),
  getMany: apiService.oidcClientControllerGetOidcClients,
  create: (data, params) => apiService.oidcClientControllerCreateOidcClient(data as CreateOidcClientDto, params),
  update: (id, data, params) =>
    apiService.oidcClientControllerUpdateOidcClient(Number(id), data as UpdateOidcClientDto, params),
  remove: (id, params) => apiService.oidcClientControllerRemoveOidcClient(Number(id), params),

  defaultValues: {
    clientId: '',
    name: '',
    description: '',
    // En tom sträng, inte en tom lista: arrayfältet klonar sin första post när
    // man lägger till en rad, och en klient utan redirect-URI kan aldrig logga in.
    redirectUris: [''],
    postLogoutRedirectUris: [''],
    isPublic: false,
    requirePkce: true,
  },
  requiredFields: ['clientId', 'name'],
  formFields: [
    'clientId',
    'name',
    'description',
    'isPublic',
    'requirePkce',
    'redirectUris',
    'postLogoutRedirectUris',
  ],
  multilineFields: ['description'],
  columns: [
    { property: 'clientId' },
    { property: 'name' },
    {
      property: 'redirectUris',
      isColumnSortable: false,
      renderColumn: (_value, item) =>
        createElement(
          'span',
          { className: 'flex flex-col gap-0.5 font-mono text-xs' },
          ...item.redirectUris.map((uri, index) =>
            createElement('span', { key: `${uri}-${index}`, className: 'break-all' }, uri)
          )
        ),
    },
    {
      // Hur klienten autentiserar sig är det som oftast felkonfigureras i RP:n,
      // så det ska synas utan att man öppnar posten.
      property: 'isPublic',
      renderColumn: (_value, item) =>
        createElement(
          Badge,
          { variant: item.isPublic ? 'outline' : 'secondary', className: 'font-normal' },
          item.isPublic ? 'PKCE (publik)' : 'client_secret'
        ),
    },
    {
      property: 'application',
      isColumnSortable: false,
      renderColumn: (_value, item) =>
        item.application ?
          namedBadges([item.application], 'outline')
        : createElement('span', { className: 'text-muted-foreground' }, '–'),
    },
  ],
};

const resources = { users, groups, applications, 'oidc-clients': oidcClients };

export default resources;
