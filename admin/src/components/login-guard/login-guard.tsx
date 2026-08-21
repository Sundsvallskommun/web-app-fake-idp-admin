import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { Button } from '@components/ui/button';
import { AUTH_EXPIRED_EVENT } from '@services/api-client';
import { useUserStore } from '@services/user-service/user-service';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [status, getMe, setUnauthenticated] = useUserStore(
    useShallow((state) => [state.status, state.getMe, state.setUnauthenticated])
  );

  const router = useRouter();
  const isLoginPage = router.pathname.includes('/login');

  useEffect(() => {
    const onAuthExpired = () => setUnauthenticated();
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, [setUnauthenticated]);

  useEffect(() => {
    if (!isLoginPage && status === 'idle') void getMe();
  }, [getMe, isLoginPage, status]);

  useEffect(() => {
    if (!isLoginPage && status === 'unauthenticated') {
      void router.replace({ pathname: '/login', query: { path: router.asPath } });
    }
  }, [isLoginPage, router, status]);

  if (isLoginPage) return <>{children}</>;

  if (status === 'idle' || status === 'loading' || status === 'unauthenticated') return <LoaderFullScreen />;

  if (status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <section role="alert" className="max-w-lg rounded-lg border bg-card p-8">
          <h1 className="text-2xl font-semibold">{t('common:connection_error_title')}</h1>
          <p className="my-4 text-muted-foreground">{t('common:connection_error_text')}</p>
          <Button onClick={() => void getMe()}>{t('common:retry')}</Button>
        </section>
      </main>
    );
  }

  // Routes by permissions
  // if (
  //   (router.pathname == '/route-by-permission' && !user.permissions.canEditSystemMessages)
  // ) {
  //   router.push('/');
  //   return <LoaderFullScreen />;
  // }

  return <>{children}</>;
};

export default LoginGuard;
