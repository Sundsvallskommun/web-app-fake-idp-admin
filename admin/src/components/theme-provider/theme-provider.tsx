import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

/**
 * next-themes-provider. Sätter klassen `dark` på <html> för mörkt läge och
 * ersätter `GuiProvider`/`ColorSchemeMode` från @sk-web-gui.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
