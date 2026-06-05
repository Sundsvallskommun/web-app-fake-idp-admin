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

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  password: string;
  attributes: UserAttribute[];
}

export interface AdminUserResponse {
  data: AdminUser;
  message: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
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
}

export interface UpdateUserDto {
  name?: string;
  username?: string;
  password?: string;
  attributes?: AttributeDto[];
}
