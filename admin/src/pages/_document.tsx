import { Head, Html, Main, NextScript } from 'next/document';

/**
 * next-themes sätter klassen på <html> via ett inline-script före hydrering.
 * Utan suppressHydrationWarning ger det en hydration-mismatch-varning vid varje
 * sidladdning.
 */
export default function Document() {
  return (
    <Html lang="sv" suppressHydrationWarning>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
