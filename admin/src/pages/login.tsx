import EmptyLayout from '@layouts/empty-layout/empty-layout.component';
import { loginAdmin } from '@services/admin-auth-service';
import { useUserStore } from '@services/user-service/user-service';
import { Button, FormControl, FormErrorMessage, FormLabel, Input } from '@sk-web-gui/react';
import axios from 'axios';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { capitalize } from 'underscore.string';

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const setUser = useUserStore((state) => state.setUser);
  const usernameInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    usernameInput.current?.focus();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await loginAdmin({ username, password });
      setUser(response.data.data);
      await router.push('/start');
    } catch (error) {
      const code = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setErrorMessage(t(`login:errors.${code || 'UNKNOWN'}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EmptyLayout title={`${process.env.NEXT_PUBLIC_APP_NAME} - Logga in`}>
      <main>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-4xl w-full flex flex-col text-light-primary bg-inverted-background-content p-12 md:p-20 shadow-lg text-left">
            <div className="mb-14">
              <p className="my-0">{capitalize(t('common:admin_for'))}</p>
              <h1 className="mb-10 text-xl">{process.env.NEXT_PUBLIC_APP_NAME}</h1>
              <p className="my-0">{t('login:description')}</p>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-16">
              <FormControl required>
                <FormLabel>{capitalize(t('login:username'))}</FormLabel>
                <Input
                  ref={usernameInput}
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormControl>

              <FormControl required>
                <FormLabel>{capitalize(t('login:password'))}</FormLabel>
                <Input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
              </FormControl>

              <Button inverted type="submit" disabled={isSubmitting} data-cy="loginButton">
                {capitalize(isSubmitting ? t('login:submitting') : t('login:submit'))}
              </Button>

              {errorMessage && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
            </form>
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
