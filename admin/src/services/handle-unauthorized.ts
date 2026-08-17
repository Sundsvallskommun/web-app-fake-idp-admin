import Router from 'next/router';

let redirecting = false;

/**
 * Gemensam 401-hantering för BÅDA HTTP-lagren (den genererade Api-klienten och
 * api-service). Tidigare hade bara api-service en 401-väg — en utloggad session
 * mitt i en CRUD-operation gav bara en fel-toast — och den gjorde dessutom en
 * hård window.location-navigering som kastade bort klienttillstånd.
 *
 * next/router hanterar basePath åt oss och navigerar mjukt. Vakten ser till att
 * parallella 401:or (flera anrop som failar samtidigt) ger EN navigering.
 */
export const handleUnauthorized = (failMessage?: string) => {
  if (redirecting || Router.pathname === '/login') {
    return;
  }
  redirecting = true;
  void Router.push({
    pathname: '/login',
    query: {
      path: Router.asPath.split('?')[0],
      ...(failMessage ? { failMessage } : {}),
    },
  }).finally(() => {
    redirecting = false;
  });
};
