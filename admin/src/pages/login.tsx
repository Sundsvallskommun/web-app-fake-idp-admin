import EmptyLayout from '@layouts/empty-layout/empty-layout.component';
import { loginAdmin } from '@services/admin-auth-service';
import { useUserStore } from '@services/user-service/user-service';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import axios from 'axios';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { capitalize } from '@utils/capitalize';

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
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full text-left">
            <CardContent className="flex flex-col p-6">
              <div className="mb-3.5">
                <p className="my-0 text-sm text-muted-foreground">{capitalize(t('common:admin_for'))}</p>
                <h1 className="mb-2.5 text-xl font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</h1>
                <p className="my-0 text-sm text-muted-foreground">{t('login:description')}</p>
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-username">{capitalize(t('login:username'))}</Label>
                  <Input
                    id="login-username"
                    ref={usernameInput}
                    name="username"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">{capitalize(t('login:password'))}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} data-cy="loginButton">
                  {capitalize(isSubmitting ? t('login:submitting') : t('login:submit'))}
                </Button>

                {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
              </form>
            </CardContent>
          </Card>
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
