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

import {
  AdminGroupListResponse,
  AdminGroupResponse,
  AdminUserListResponse,
  AdminUserResponse,
  CreateGroupDto,
  CreateUserDto,
  ImportUsersDto,
  ImportUsersResponse,
  LoginAdminDto,
  UpdateGroupDto,
  UpdateUserDto,
  UserApiResponse,
} from './data-contracts';
import { ContentType, HttpClient, RequestParams } from './http-client';

export class Api<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Index
   * @name IndexControllerIndex
   * @summary Index
   * @request GET:/api/
   */
  indexControllerIndex = (params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerGetMe
   * @summary Return current user
   * @request GET:/api/me
   */
  userControllerGetMe = (params: RequestParams = {}) =>
    this.request<UserApiResponse, any>({
      path: `/api/me`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerGetUsers
   * @summary List all fake-IdP users
   * @request GET:/api/users
   */
  userControllerGetUsers = (params: RequestParams = {}) =>
    this.request<AdminUserListResponse, any>({
      path: `/api/users`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerCreateUser
   * @summary Create a fake-IdP user
   * @request POST:/api/users
   */
  userControllerCreateUser = (data?: CreateUserDto, params: RequestParams = {}) =>
    this.request<AdminUserResponse, any>({
      path: `/api/users`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerExportUsers
   * @summary Export all fake-IdP users as a users.js module
   * @request GET:/api/users/export
   */
  userControllerExportUsers = (params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/users/export`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerGetUser
   * @summary Return a single fake-IdP user
   * @request GET:/api/users/{id}
   */
  userControllerGetUser = (id: string, params: RequestParams = {}) =>
    this.request<AdminUserResponse, any>({
      path: `/api/users/${id}`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerUpdateUser
   * @summary Update a fake-IdP user
   * @request PUT:/api/users/{id}
   */
  userControllerUpdateUser = (id: string, data?: UpdateUserDto, params: RequestParams = {}) =>
    this.request<AdminUserResponse, any>({
      path: `/api/users/${id}`,
      method: 'PUT',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerRemoveUser
   * @summary Delete a fake-IdP user
   * @request DELETE:/api/users/{id}
   */
  userControllerRemoveUser = (id: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/users/${id}`,
      method: 'DELETE',
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerImportUsers
   * @summary Replace all users with the contents of an uploaded users.js file
   * @request POST:/api/users/import
   */
  userControllerImportUsers = (data?: ImportUsersDto, params: RequestParams = {}) =>
    this.request<ImportUsersResponse, any>({
      path: `/api/users/import`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Health
   * @name HealthControllerUp
   * @summary Return health check
   * @request GET:/api/health/up
   */
  healthControllerUp = (params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/health/up`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags Admin Auth
   * @name AdminAuthControllerLogin
   * @summary Sign in to the admin panel with the configured operator account
   * @request POST:/api/admin-auth/login
   */
  adminAuthControllerLogin = (data?: LoginAdminDto, params: RequestParams = {}) =>
    this.request<UserApiResponse, any>({
      path: `/api/admin-auth/login`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Admin Auth
   * @name AdminAuthControllerLogout
   * @summary Sign out from the admin panel
   * @request POST:/api/admin-auth/logout
   */
  adminAuthControllerLogout = (params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/admin-auth/logout`,
      method: 'POST',
      ...params,
    });
  /**
   * No description
   *
   * @tags Group
   * @name GroupControllerGetGroups
   * @summary List documented SAML groups
   * @request GET:/api/groups
   */
  groupControllerGetGroups = (params: RequestParams = {}) =>
    this.request<AdminGroupListResponse, any>({
      path: `/api/groups`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags Group
   * @name GroupControllerCreateGroup
   * @summary Create a documented SAML group
   * @request POST:/api/groups
   */
  groupControllerCreateGroup = (data?: CreateGroupDto, params: RequestParams = {}) =>
    this.request<AdminGroupResponse, any>({
      path: `/api/groups`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Group
   * @name GroupControllerGetGroup
   * @summary Return a documented SAML group
   * @request GET:/api/groups/{id}
   */
  groupControllerGetGroup = (id: number, params: RequestParams = {}) =>
    this.request<AdminGroupResponse, any>({
      path: `/api/groups/${id}`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags Group
   * @name GroupControllerUpdateGroup
   * @summary Update a documented SAML group
   * @request PUT:/api/groups/{id}
   */
  groupControllerUpdateGroup = (id: number, data?: UpdateGroupDto, params: RequestParams = {}) =>
    this.request<AdminGroupResponse, any>({
      path: `/api/groups/${id}`,
      method: 'PUT',
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Group
   * @name GroupControllerRemoveGroup
   * @summary Delete a documented SAML group and its memberships
   * @request DELETE:/api/groups/{id}
   */
  groupControllerRemoveGroup = (id: number, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/groups/${id}`,
      method: 'DELETE',
      ...params,
    });
}
