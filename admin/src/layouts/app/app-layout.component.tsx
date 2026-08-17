import { ConfirmProvider } from '@components/confirm/confirm';
import LoginGuard from '@components/login-guard/login-guard';
import { ThemeProvider } from '@components/theme-provider/theme-provider';
import { Toaster } from '@components/ui/sonner';
import 'dayjs/locale/sv';
import type { AppProps } from 'next/app';

export function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <LoginGuard>
          <Component {...pageProps} />
        </LoginGuard>
      </ConfirmProvider>
      <Toaster richColors closeButton />
    </ThemeProvider>
  );
}
