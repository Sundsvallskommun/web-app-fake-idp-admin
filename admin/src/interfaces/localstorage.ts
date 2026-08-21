import { ResourceName } from './resource-name';

export type TableProperty = string;

export type Headers = Partial<Record<ResourceName, Array<TableProperty>>>;

export interface DataStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>[];
  loaded: boolean;
  loading: boolean;
  /** Senaste hämtningen misslyckades. Nollställs vid lyckad hämtning. */
  error?: boolean;
}

export type ResourceData = Partial<Record<ResourceName, DataStorage>>;

export interface LocalStorage {
  headers: Headers;
  setHeaders: (headers: Headers) => void;
  resourceData: ResourceData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setData: (resource: ResourceName, data: Record<string, any>[]) => void;
  setLoaded: (resource: ResourceName, loaded: boolean) => void;
  setLoading: (resource: ResourceName, loading: boolean) => void;
  setError: (resource: ResourceName, error: boolean) => void;
}
