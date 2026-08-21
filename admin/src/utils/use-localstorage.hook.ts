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
      setError: (resource, error) =>
        set((state) => {
          const oldData = state?.resourceData?.[resource] ?? newResource;
          return {
            resourceData: { ...state.resourceData, [resource]: { ...oldData, error } },
          };
        }),
      resetResourceData: () => set({ resourceData: {} }),
    }),
    {
      name: `${process.env.NEXT_PUBLIC_APP_NAME}-admin-store`,
      storage: createJSONStorage(() => sessionStorage),
      // Column preferences may survive a reload; API data belongs to the active
      // admin session and must always be fetched again.
      partialize: (state) => ({ ...state, resourceData: {} }),
    }
  )
);
