/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface User {
  name: string;
  username: string;
  defaultCredentials?: boolean;
}

export interface UserApiResponse {
  data: User;
  message: string;
}

export interface UserAttribute {
  id: number;
  key: string;
  format: string;
  value: string;
  type: string;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string;
}

export interface UserApplication {
  id: number;
  name: string;
  description: string;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  password: string;
  attributes: UserAttribute[];
  groups: UserGroup[];
  applications: UserApplication[];
}

export interface AdminUserResponse {
  data: AdminUser;
  message: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  message: string;
}

export interface CitizenIdentifier {
  value: string;
}

export interface CitizenIdentifierResponse {
  data: CitizenIdentifier;
  message: string;
}

export interface AssertionPreviewAttribute {
  key: string;
  format: string;
  value: string;
  type: string;
}

export interface AssertionPreview {
  nameId: string;
  attributes: AssertionPreviewAttribute[];
}

export interface ClaimsPreviewEntry {
  name: string;
  value: string;
  type: string;
}

export interface ClaimsPreview {
  sub: string;
  claims: ClaimsPreviewEntry[];
}

export interface ClaimsPreviewResponse {
  data: ClaimsPreview;
  message: string;
}

export interface AssertionPreviewResponse {
  data: AssertionPreview;
  message: string;
}

export interface ImportUsersResult {
  imported: number;
  format: string;
}

export interface UsersImportPreview {
  confirmationToken: string;
  format: string;
  currentUserCount: number;
  incomingUserCount: number;
  preservedUserIds: number;
  generatedUserIds: number;
  removedUserIds: number;
  groupCount: number;
  applicationCount: number;
  replacesGroupCatalog: boolean;
  replacesApplicationCatalog: boolean;
  warnings: string[];
}

export interface UsersImportPreviewResponse {
  data: UsersImportPreview;
  message: string;
}

export interface ImportUsersResponse {
  data: ImportUsersResult;
  message: string;
}

export interface AttributeDto {
  key: string;
  format: string;
  value: string;
  type: string;
}

export interface CreateUserDto {
  name: string;
  username: string;
  password: string;
  attributes?: AttributeDto[];
  /** @uniqueItems true */
  groupIds?: number[];
  /** @uniqueItems true */
  applicationIds?: number[];
}

export interface ImportUsersDto {
  content: string;
  confirmationToken: string;
}

export interface PreviewUsersImportDto {
  content: string;
}

export interface UpdateUserDto {
  name?: string;
  username?: string;
  password?: string;
  attributes?: AttributeDto[];
  /** @uniqueItems true */
  groupIds?: number[];
  /** @uniqueItems true */
  applicationIds?: number[];
}

export interface LoginAdminDto {
  username: string;
  password: string;
}

export interface GroupMember {
  id: string;
  name: string;
  username: string;
}

export interface GroupApplication {
  id: number;
  name: string;
  description: string;
}

export interface AdminGroup {
  id: number;
  name: string;
  description: string;
  userCount: number;
  users: GroupMember[];
  applications: GroupApplication[];
}

export interface AdminGroupResponse {
  data: AdminGroup;
  message: string;
}

export interface AdminGroupListResponse {
  data: AdminGroup[];
  message: string;
}

export interface CreateGroupDto {
  /**
   * @minLength 1
   * @pattern ^[^,]+$
   */
  name: string;
  description: string;
  /** @uniqueItems true */
  applicationIds?: number[];
}

export interface UpdateGroupDto {
  /**
   * @minLength 1
   * @pattern ^[^,]+$
   */
  name?: string;
  description?: string;
  /** @uniqueItems true */
  applicationIds?: number[];
}

export interface ApplicationMember {
  id: string;
  name: string;
  username: string;
}

export interface ApplicationGroup {
  id: number;
  name: string;
  description: string;
  userCount: number;
}

export interface AdminApplication {
  id: number;
  name: string;
  description: string;
  userCount: number;
  users: ApplicationMember[];
  groups: ApplicationGroup[];
}

export interface AdminApplicationResponse {
  data: AdminApplication;
  message: string;
}

export interface AdminApplicationListResponse {
  data: AdminApplication[];
  message: string;
}

export interface CreateApplicationDto {
  /** @minLength 1 */
  name: string;
  description: string;
}

export interface UpdateApplicationDto {
  /** @minLength 1 */
  name?: string;
  description?: string;
}

export interface OidcClientApplication {
  id: number;
  name: string;
}

export interface AdminOidcClient {
  id: number;
  clientId: string;
  clientSecret: string;
  name: string;
  description: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  requirePkce: boolean;
  isPublic: boolean;
  applicationId?: number;
  application?: OidcClientApplication;
}

export interface AdminOidcClientResponse {
  data: AdminOidcClient;
  message: string;
}

export interface AdminOidcClientListResponse {
  data: AdminOidcClient[];
  message: string;
}

export interface CreateOidcClientDto {
  /** @minLength 1 */
  clientId: string;
  /** @minLength 1 */
  name: string;
  description: string;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  isPublic?: boolean;
  requirePkce?: boolean;
  clientSecret?: string;
  applicationId?: number;
}

export interface UpdateOidcClientDto {
  /** @minLength 1 */
  clientId?: string;
  /** @minLength 1 */
  name?: string;
  description?: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  isPublic?: boolean;
  requirePkce?: boolean;
  clientSecret?: string;
  applicationId?: number;
}
