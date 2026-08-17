import { apiURL } from '@utils/api-url';
import { getCsrfToken } from './csrf-service';
import { handleUnauthorized } from './handle-unauthorized';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export const handleError = (error: AxiosError<ApiResponse>) => {
  if (error?.response?.status === 401) {
    handleUnauthorized(error.response.data?.message);
  }

  throw error;
};

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

const protectedOptions = async (options?: AxiosRequestConfig): Promise<AxiosRequestConfig> => ({
  ...defaultOptions,
  ...options,
  headers: {
    ...defaultOptions.headers,
    ...options?.headers,
    'x-csrf-token': await getCsrfToken(),
  },
});

const get = <T>(url: string, options?: AxiosRequestConfig) =>
  axios.get<T>(apiURL(url), { ...defaultOptions, ...options }).catch(handleError);

const post = async <T>(url: string, data: unknown, options?: AxiosRequestConfig) => {
  return axios.post<T>(apiURL(url), data, await protectedOptions(options)).catch(handleError);
};

const remove = async <T>(url: string, options?: AxiosRequestConfig) => {
  return axios.delete<T>(apiURL(url), await protectedOptions(options)).catch(handleError);
};

const patch = async <T>(url: string, data: unknown, options?: AxiosRequestConfig) => {
  return axios.patch<T>(apiURL(url), data, await protectedOptions(options)).catch(handleError);
};

const put = async <T>(url: string, data: unknown, options?: AxiosRequestConfig) => {
  return axios.put<T>(apiURL(url), data, await protectedOptions(options)).catch(handleError);
};

export const apiService = { get, post, put, patch, delete: remove };
