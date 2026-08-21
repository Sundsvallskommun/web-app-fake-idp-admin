import { AxiosResponse } from 'axios';
import { LucideIcon } from 'lucide-react';
import { FieldPath } from 'react-hook-form';
import { Create, GetMany, GetOne, ID, Remove, Update } from './resource-services';
import { ServiceResponse } from './services';
import type { ResourceName } from './resource-name';

export type ResourceResponse<T> = Promise<AxiosResponse<ServiceResponse<T>>>;

/**
 * Kolumndefinition för listtabellen. Ersätter `AutoTableHeader` från
 * @sk-web-gui/react och behåller exakt de fält appen faktiskt använder.
 * Generisk över radtypen så att `renderColumn` i resursregistret får rätt typ
 * på `item` — utan den försvann API-ändringar i casts och small i runtime.
 */
export interface ResourceColumn<T = Record<string, unknown>> {
  /** Fältet i dataraden som kolumnen visar. */
  property: string;
  /** Faller tillbaka på `<resource>:properties.<property>` när den utelämnas. */
  label?: string;
  /** @default true */
  isColumnSortable?: boolean;
  /**
   * Egen rendering. `value` är radens fältvärde, `item` hela raden.
   * Metodsyntax (inte pilfunktionsegenskap) med avsikt: den är bivariant under
   * strictFunctionTypes, så registret får `item` typad per resurs samtidigt som
   * de generiska sidorna kan behandla kolumner radtypslöst.
   */
  renderColumn?(value: unknown, item: T): React.ReactNode;
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
  /** Menyikon i sidomenyn. Utan ikon faller menyn tillbaka på en generisk. */
  icon?: LucideIcon;
  getOne: GetOne<ResourceResponse<T>>;
  getMany: GetMany<ResourceResponse<T[]>>;
  create?: Create<TCreate, ResourceResponse<T>>;
  update?: Update<TUpdate, ResourceResponse<T>>;
  remove?: Remove<Promise<unknown>>;
  defaultValues?: TCreate;
  /** Maps an API resource to the editable form shape while retaining its id. */
  toForm?(data: T): ResourceData;
  requiredFields?: Array<FieldPath<TCreate & TUpdate>>;
  /** Fält som redigeras i flerradig textarea istället för enradigt input. */
  multilineFields?: Array<FieldPath<TCreate & TUpdate>>;
  formFields?: Array<Extract<keyof (TCreate & TUpdate), string>>;
  /** Relations edited with the shared searchable checkbox picker. */
  relationFields?: Array<{
    property: FieldPath<TCreate & TUpdate>;
    targetResource: ResourceName;
  }>;
  /**
   * Explicit list-table columns. When set, these override the columns that are
   * otherwise auto-derived from the primitive fields of the data, and the
   * column-picker in the list toolbar is hidden. Use this to surface nested or
   * computed values (e.g. a SAML attribute) or to hide sensitive fields.
   * Labels fall back to the `<resource>:properties.<property>` translation.
   */
  columns?: ResourceColumn<T>[];
  /**
   * Sorteringen listan öppnas med. `property` måste matcha en kolumns
   * `property` — annars ignoreras den av tabellen.
   */
  defaultSort?: { property: string; desc?: boolean };
};
