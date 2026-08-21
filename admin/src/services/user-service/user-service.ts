import { ApiResponse, apiService } from '../api-service';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { emptyUser } from './defaults';
import { ServiceResponse } from '@interfaces/services';
import { User } from '@data-contracts/backend/data-contracts';

/**
 * Sessionsanvändaren med backendflaggan för defaultlösenord. Lokal utökning av
 * den genererade typen tills kontrakten regenererats mot en backend som har
 * fältet (yarn generate:contracts kräver körande backend).
 */
export type AdminSessionUser = User & { defaultCredentials?: boolean };

const handleSetUserResponse: (res: ApiResponse<AdminSessionUser>) => AdminSessionUser = (res) => ({
  name: res.data.name,
  username: res.data.username,
  defaultCredentials: res.data.defaultCredentials === true,
  // permissions: res.data.permissions,
});

const getMe: () => Promise<ServiceResponse<AdminSessionUser>> = () => {
  return apiService
    .get<ApiResponse<AdminSessionUser>>('me')
    .then((res) => ({ data: handleSetUserResponse(res.data) }))
    .catch((e) => ({
      message: e.response?.data.message,
      error: e.response?.status ?? 'UNKNOWN ERROR',
    }));
};

interface State {
  user: AdminSessionUser;
}
interface Actions {
  setUser: (user: AdminSessionUser) => void;
  getMe: () => Promise<ServiceResponse<AdminSessionUser>>;
  reset: () => void;
}

const initialState: State = {
  user: emptyUser,
};

export const useUserStore = create<State & Actions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      setUser: (user) => set(() => ({ user })),
      getMe: async () => {
        let user = get().user;
        const res = await getMe();
        if (!res.error && res.data) {
          user = res.data;
          set(() => ({ user: user }));
        }
        return { data: user };
      },
      reset: () => {
        set(initialState);
      },
    }),
    { enabled: process.env.NODE_ENV !== 'production' }
  )
);
