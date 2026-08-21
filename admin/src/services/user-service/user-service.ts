import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { emptyUser } from './defaults';
import { ServiceResponse } from '@interfaces/services';
import { User } from '@data-contracts/backend/data-contracts';
import { apiClient } from '@services/api-client';
import axios from 'axios';

/**
 * Sessionsanvändaren med backendflaggan för defaultlösenord. Lokal utökning av
 * den genererade typen tills kontrakten regenererats mot en backend som har
 * fältet (yarn generate:contracts kräver körande backend).
 */
export type AdminSessionUser = User & { defaultCredentials?: boolean };

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface State {
  user: AdminSessionUser;
  status: AuthStatus;
  error?: string;
}
interface Actions {
  setUser: (user: AdminSessionUser) => void;
  getMe: () => Promise<ServiceResponse<AdminSessionUser>>;
  setUnauthenticated: () => void;
  reset: () => void;
}

const initialState: State = {
  user: emptyUser,
  status: 'idle',
  error: undefined,
};

export const useUserStore = create<State & Actions>()(
  devtools(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user, status: 'authenticated', error: undefined }),
      getMe: async () => {
        set({ status: 'loading', error: undefined });
        try {
          const response = await apiClient.userControllerGetMe();
          const user: AdminSessionUser = {
            name: response.data.data.name,
            username: response.data.data.username,
            defaultCredentials: response.data.data.defaultCredentials === true,
          };
          set({ user, status: 'authenticated', error: undefined });
          return { data: user };
        } catch (error) {
          const responseStatus = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (responseStatus === 401) {
            set({ user: emptyUser, status: 'unauthenticated', error: undefined });
          } else {
            set({ user: emptyUser, status: 'error', error: 'ADMIN_CONNECTION_FAILED' });
          }
          return {
            message: axios.isAxiosError(error) ? error.response?.data?.message : undefined,
            error: responseStatus ?? 'UNKNOWN ERROR',
          };
        }
      },
      setUnauthenticated: () => set({ user: emptyUser, status: 'unauthenticated', error: undefined }),
      reset: () => set(initialState),
    }),
    { enabled: process.env.NODE_ENV !== 'production' }
  )
);
