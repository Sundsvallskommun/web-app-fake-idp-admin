import { AutoTableHeader } from '@sk-web-gui/react';
import { AxiosResponse } from 'axios';
import { FieldPath } from 'react-hook-form';
import { Create, GetMany, GetOne, ID, Remove, Update } from './resource-services';
import { ServiceResponse } from './services';

export type ResourceResponse<T> = Promise<AxiosResponse<ServiceResponse<T>>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResourceData = Record<string, any> & { id?: ID };

export type Resource<
  T extends ResourceData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCreate extends Record<string, any> = Partial<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TUpdate extends Record<string, any> = Partial<T>,
> = {
  name: string;
  getOne: GetOne<ResourceResponse<T>>;
  getMany: GetMany<ResourceResponse<T[]>>;
  create?: Create<TCreate, ResourceResponse<T>>;
  update?: Update<TUpdate, ResourceResponse<T>>;
  remove?: Remove;
  defaultValues?: TCreate;
  requiredFields?: Array<FieldPath<TCreate & TUpdate>>;
  /**
   * Explicit list-table columns. When set, these override the columns that are
   * otherwise auto-derived from the primitive fields of the data, and the
   * column-picker in the list toolbar is hidden. Use this to surface nested or
   * computed values (e.g. a SAML attribute) or to hide sensitive fields.
   * Labels fall back to the `<resource>:properties.<property>` translation.
   */
  columns?: AutoTableHeader[];
};
