import { logoutAdmin } from '@services/admin-auth-service';
import { useUserStore } from '@services/user-service/user-service';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLocalStorage } from '@utils/use-localstorage.hook';

export default function Logout() {
  const router = useRouter();
  const resetUser = useUserStore(useShallow((state) => state.reset));
  const resetResourceData = useLocalStorage(useShallow((state) => state.resetResourceData));

  useEffect(() => {
    logoutAdmin().finally(() => {
      resetUser();
      resetResourceData();
      void router.replace('/login?loggedout');
    });
  }, [resetResourceData, resetUser, router]);

  return null;
}
