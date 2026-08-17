import 'dotenv';
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import { LocalStorage } from '../interfaces/localstorage';

const newResource = {
  data: [],
  loaded: false,
  loading: false,
};

export const useLocalStorage = create(
  persist<LocalStorage>(
    (set) => ({
      headers: {},
      setHeaders: (headers) => set((state) => ({ headers: { ...state.headers, ...headers } })),
      resourceData: {},
      setData: (resource, data) =>
        set((state) => {
          const oldData = state?.resourceData?.[resource] ?? newResource;
          return {
            resourceData: { ...state.resourceData, [resource]: { ...oldData, data } },
          };
        }),
      setLoaded: (resource, loaded) =>
        set((state) => {
          const oldData = state?.resourceData?.[resource] ?? newResource;
          return {
            resourceData: { ...state.resourceData, [resource]: { ...oldData, loaded } },
          };
        }),
      setLoading: (resource, loading) =>
        set((state) => {
          const oldData = state?.resourceData?.[resource] ?? newResource;
          return {
            resourceData: { ...state.resourceData, [resource]: { ...oldData, loading } },
          };
        }),
    }),
    {
      name: `${process.env.NEXT_PUBLIC_APP_NAME}-admin-store`,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
