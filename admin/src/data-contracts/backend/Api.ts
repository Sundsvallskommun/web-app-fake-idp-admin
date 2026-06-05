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
  AdminUserListResponse,
  AdminUserResponse,
  CreateUserDto,
  UpdateUserDto,
  UserApiResponse,
} from './data-contracts';
import { ContentType, HttpClient, RequestParams } from './http-client';

export class Api<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
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
}
