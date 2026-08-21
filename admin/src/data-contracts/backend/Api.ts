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

import {
  AdminApplicationListResponse,
  AdminApplicationResponse,
  AdminGroupListResponse,
  AdminGroupResponse,
  AdminUserListResponse,
  AdminUserResponse,
  AssertionPreviewResponse,
  CitizenIdentifierResponse,
  CreateApplicationDto,
  CreateGroupDto,
  CreateUserDto,
  ImportUsersDto,
  ImportUsersResponse,
  LoginAdminDto,
  PreviewUsersImportDto,
  UpdateApplicationDto,
  UpdateGroupDto,
  UpdateUserDto,
  UserApiResponse,
  UsersImportPreviewResponse,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
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
      method: "GET",
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
      method: "GET",
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
      method: "GET",
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
  userControllerCreateUser = (
    data?: CreateUserDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminUserResponse, any>({
      path: `/api/users`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerExportUsers
   * @summary Export a complete, versioned JSON backup of fake-IdP data
   * @request GET:/api/users/export
   */
  userControllerExportUsers = (params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/users/export`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerGetCitizenIdentifier
   * @summary Reveal the citizen identifier for a fake-IdP user
   * @request GET:/api/users/{id}/citizen-identifier
   */
  userControllerGetCitizenIdentifier = (
    id: string,
    params: RequestParams = {},
  ) =>
    this.request<CitizenIdentifierResponse, any>({
      path: `/api/users/${id}/citizen-identifier`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerGetAssertionPreview
   * @summary Preview the saved SAML NameID and attributes with sensitive values masked
   * @request GET:/api/users/{id}/assertion-preview
   */
  userControllerGetAssertionPreview = (
    id: string,
    params: RequestParams = {},
  ) =>
    this.request<AssertionPreviewResponse, any>({
      path: `/api/users/${id}/assertion-preview`,
      method: "GET",
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
      method: "GET",
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
  userControllerUpdateUser = (
    id: string,
    data?: UpdateUserDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminUserResponse, any>({
      path: `/api/users/${id}`,
      method: "PUT",
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
      method: "DELETE",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerPreviewImportUsers
   * @summary Validate and preview a backup or legacy users.js import
   * @request POST:/api/users/import/preview
   */
  userControllerPreviewImportUsers = (
    data?: PreviewUsersImportDto,
    params: RequestParams = {},
  ) =>
    this.request<UsersImportPreviewResponse, any>({
      path: `/api/users/import/preview`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name UserControllerImportUsers
   * @summary Replace data from a previously previewed backup or legacy users.js import
   * @request POST:/api/users/import
   */
  userControllerImportUsers = (
    data?: ImportUsersDto,
    params: RequestParams = {},
  ) =>
    this.request<ImportUsersResponse, any>({
      path: `/api/users/import`,
      method: "POST",
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
      method: "GET",
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
  adminAuthControllerLogin = (
    data?: LoginAdminDto,
    params: RequestParams = {},
  ) =>
    this.request<UserApiResponse, any>({
      path: `/api/admin-auth/login`,
      method: "POST",
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
      method: "POST",
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
      method: "GET",
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
  groupControllerCreateGroup = (
    data?: CreateGroupDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminGroupResponse, any>({
      path: `/api/groups`,
      method: "POST",
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
      method: "GET",
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
  groupControllerUpdateGroup = (
    id: number,
    data?: UpdateGroupDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminGroupResponse, any>({
      path: `/api/groups/${id}`,
      method: "PUT",
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
      method: "DELETE",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name ApplicationControllerGetApplications
   * @summary List connected test applications
   * @request GET:/api/applications
   */
  applicationControllerGetApplications = (params: RequestParams = {}) =>
    this.request<AdminApplicationListResponse, any>({
      path: `/api/applications`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name ApplicationControllerCreateApplication
   * @summary Create a connected test application
   * @request POST:/api/applications
   */
  applicationControllerCreateApplication = (
    data?: CreateApplicationDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminApplicationResponse, any>({
      path: `/api/applications`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name ApplicationControllerGetApplication
   * @summary Return a connected test application
   * @request GET:/api/applications/{id}
   */
  applicationControllerGetApplication = (
    id: number,
    params: RequestParams = {},
  ) =>
    this.request<AdminApplicationResponse, any>({
      path: `/api/applications/${id}`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name ApplicationControllerUpdateApplication
   * @summary Update a connected test application
   * @request PUT:/api/applications/{id}
   */
  applicationControllerUpdateApplication = (
    id: number,
    data?: UpdateApplicationDto,
    params: RequestParams = {},
  ) =>
    this.request<AdminApplicationResponse, any>({
      path: `/api/applications/${id}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name ApplicationControllerRemoveApplication
   * @summary Delete a connected test application and its memberships
   * @request DELETE:/api/applications/{id}
   */
  applicationControllerRemoveApplication = (
    id: number,
    params: RequestParams = {},
  ) =>
    this.request<AdminApplicationResponse, any>({
      path: `/api/applications/${id}`,
      method: "DELETE",
      ...params,
    });
}
