import { logoutAdmin } from '@services/admin-auth-service';
import { useUserStore } from '@services/user-service/user-service';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function Logout() {
  const router = useRouter();
  const resetUser = useUserStore(useShallow((state) => state.reset));

  useEffect(() => {
    logoutAdmin().finally(() => {
      resetUser();
      localStorage.clear();
      void router.replace('/login?loggedout');
    });
  }, [resetUser, router]);

  return null;
}
