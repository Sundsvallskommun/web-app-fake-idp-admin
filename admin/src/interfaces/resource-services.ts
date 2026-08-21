import { RequestParams } from '@data-contracts/backend/http-client';

export type ID = string | number;
export type GetOne<TResponse> = (id: ID, params?: RequestParams) => TResponse;
export type GetMany<TResponse> = (params?: RequestParams) => TResponse;
export type Create<TData, TResponse> = (data: TData, params?: RequestParams) => TResponse;
export type Update<TData, TResponse> = (id: ID, data: TData, params?: RequestParams) => TResponse;
// Explicit TResponse som syskonen (inte `any` som tidigare): med any kompilerade
// misstaget att skicka `remove(id)` — ett redan startat promise — dit en thunk
// förväntades. Resource<T> sätter TResponse till ResourceResponse<unknown>.
export type Remove<TResponse> = (id: ID, params?: RequestParams) => TResponse;
