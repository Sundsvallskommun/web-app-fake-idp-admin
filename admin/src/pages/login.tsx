import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import EmptyLayout from '@layouts/empty-layout/empty-layout.component';
import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { appURL } from '@utils/app-url';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { apiURL } from '@utils/api-url';
import { GetServerSideProps } from 'next';
import { capitalize } from 'underscore.string';

// Turn on/off automatic login
const autoLogin = true;

export default function Start() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const params = new URLSearchParams(window.location.search);
  const isLoggedOut = params.get('loggedout') === '';
  const failMessage = params.get('failMessage');

  const initalFocus = useRef<HTMLButtonElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initalFocus?.current?.focus();
    });
  };

  const onLogin = () => {
    const path = router.query.path || new URLSearchParams(window.location.search).get('path') || '';

    const url = new URL(apiURL('/saml/login'));
    const queries = new URLSearchParams({
      successRedirect: `${appURL(path as string)}`,
      failureRedirect: `${appURL()}/login`,
    });
    url.search = queries.toString();
    // NOTE: send user to login with SSO
    window.location.href = url.toString();
  };

  const onLogoutAndRetry = () => {
    const url = new URL(apiURL('/saml/idp/logout'));
    url.search = new URLSearchParams({
      RelayState: `${appURL()}/login`,
    }).toString();
    window.location.href = url.toString();
  };

  useEffect(() => {
    setInitalFocus();
    if (!router.isReady) return;
    if (isLoggedOut) {
      router.push(
        {
          pathname: '/login',
        },
        '/login',
        { shallow: true }
      );
      setIsLoading(false);
    } else {
      if (failMessage === 'NOT_AUTHORIZED' && autoLogin) {
        // autologin
        onLogin();
      } else if (failMessage) {
        setErrorMessage(t(`login:errors.${failMessage}`));
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  if (isLoading) {
    // to not flash the login-screen on autologin
    return <LoaderFullScreen />;
  }

  return (
    <EmptyLayout title={`${process.env.NEXT_PUBLIC_APP_NAME} - Logga In`}>
      <main>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-5xl w-full flex flex-col text-light-primary bg-inverted-background-content p-20 shadow-lg text-left">
            <div className="mb-14">
              <p className="my-0">{capitalize(t('common:admin_for'))}</p>
              <h1 className="mb-10 text-xl">{process.env.NEXT_PUBLIC_APP_NAME}</h1>
              <p className="my-0">{t('login:description')}</p>
            </div>

            <Button inverted onClick={() => onLogin()} ref={initalFocus} data-cy="loginButton">
              {capitalize(t('common:login'))}
            </Button>

            {errorMessage && (
              <>
                <FormErrorMessage className="mt-lg">{errorMessage}</FormErrorMessage>
                <Button
                  inverted
                  variant="secondary"
                  className="mt-md"
                  onClick={() => onLogoutAndRetry()}
                  data-cy="logoutRetryButton"
                >
                  {capitalize(t('login:logout_and_retry'))}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </EmptyLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'login', 'crud'])),
  },
});
