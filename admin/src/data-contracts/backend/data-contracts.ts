/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
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

export interface ImportUsersResult {
  imported: number;
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

export interface AdminGroup {
  id: number;
  name: string;
  description: string;
  userCount: number;
  users: GroupMember[];
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
}

export interface UpdateGroupDto {
  /**
   * @minLength 1
   * @pattern ^[^,]+$
   */
  name?: string;
  description?: string;
}

export interface ApplicationMember {
  id: string;
  name: string;
  username: string;
}

export interface AdminApplication {
  id: number;
  name: string;
  description: string;
  userCount: number;
  users: ApplicationMember[];
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
