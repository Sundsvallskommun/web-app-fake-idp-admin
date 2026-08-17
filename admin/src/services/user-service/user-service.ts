import { ApiResponse, apiService } from '../api-service';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { emptyUser } from './defaults';
import { ServiceResponse } from '@interfaces/services';
import { User } from '@data-contracts/backend/data-contracts';

const handleSetUserResponse: (res: ApiResponse<User>) => User = (res) => ({
  name: res.data.name,
  username: res.data.username,
  // permissions: res.data.permissions,
});

const getMe: () => Promise<ServiceResponse<User>> = () => {
  return apiService
    .get<ApiResponse<User>>('me')
    .then((res) => ({ data: handleSetUserResponse(res.data) }))
    .catch((e) => ({
      message: e.response?.data.message,
      error: e.response?.status ?? 'UNKNOWN ERROR',
    }));
};

interface State {
  user: User;
}
interface Actions {
  setUser: (user: User) => void;
  getMe: () => Promise<ServiceResponse<User>>;
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
