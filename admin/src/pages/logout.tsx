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
      // next-themes sparar temavalet i localStorage under nyckeln `theme`. Tidigare låg
      // färgschemat i zustand/sessionStorage och överlevde därför clear() — bevara det
      // explicit så utloggning inte nollställer användarens ljus/mörk-val.
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme !== null) localStorage.setItem('theme', theme);
      void router.replace('/login?loggedout');
    });
  }, [resetUser, router]);

  return null;
}
