import { AxiosResponse } from 'axios';
import { FieldPath } from 'react-hook-form';
import { Create, GetMany, GetOne, ID, Remove, Update } from './resource-services';
import { ServiceResponse } from './services';

export type ResourceResponse<T> = Promise<AxiosResponse<ServiceResponse<T>>>;

/**
 * Kolumndefinition för listtabellen. Ersätter `AutoTableHeader` från
 * @sk-web-gui/react och behåller exakt de fält appen faktiskt använder, så att
 * `config/resources.ts` kan lämnas oförändrad.
 */
export interface ResourceColumn {
  /** Fältet i dataraden som kolumnen visar. */
  property: string;
  /** Faller tillbaka på `<resource>:properties.<property>` när den utelämnas. */
  label?: string;
  /** @default true */
  isColumnSortable?: boolean;
  /** Egen rendering. `value` är radens fältvärde, `item` hela raden. */
  renderColumn?: (value: unknown, item: Record<string, unknown>) => React.ReactNode;
  /** Rubriken renderas men döljs visuellt (för t.ex. åtgärdskolumner). */
  screenReaderOnly?: boolean;
  /** Kolumnen fästs vid högerkanten. */
  sticky?: boolean;
}
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
  columns?: ResourceColumn[];
};
