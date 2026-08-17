import { useUserStore } from '@services/user-service/user-service';
import { apiURL } from '@utils/api-url';
import { appURL } from '@utils/app-url';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function Logout() {
  const resetUser = useUserStore(useShallow((s) => s.reset));

  useEffect(() => {
    resetUser();
    // next-themes sparar temavalet i localStorage under nyckeln `theme`. Tidigare låg
    // färgschemat i zustand/sessionStorage och överlevde därför clear() — bevara det
    // explicit så utloggning inte nollställer användarens ljus/mörk-val.
    const theme = localStorage.getItem('theme');
    localStorage.clear();
    if (theme !== null) localStorage.setItem('theme', theme);

    const url = new URL(apiURL('/saml/logout'));
    url.search = new URLSearchParams({
      successRedirect: `${appURL()}/login?loggedout`,
    }).toString();
    window.location.href = url.toString();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}
