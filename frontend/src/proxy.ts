import { NextRequest, NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from '@app/i18nConfig';
import { envs } from '../middleware-envs';

export async function proxy(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // Next 16 invokes Proxy again for the URL produced by an internal rewrite.
  // The first pass has already handled auth and locale detection, so continuing
  // through next-i18n-router would redirect the default locale back to the
  // public URL and create a loop.
  if (req.headers.get('x-internal-i18n-rewrite') === '1') {
    return NextResponse.next();
  }

  if (pathname === '/admin') {
    return NextResponse.redirect(new URL(envs.adminUrl));
  }

  if (envs.protectedRoutes.includes(pathname)) {
    const cookieName = 'connect.sid';
    const token = req.cookies.get(cookieName)?.value || '';

    const response = await fetch(`${envs.apiUrl}/me`, {
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: `${cookieName}=${encodeURIComponent(token)}`,
      },
    });

    if (response.status === 401) {
      const loginUrl = new URL(`${envs.basePath}/login`, origin);
      loginUrl.searchParams.set('path', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  req.headers.set('x-path', pathname);
  req.headers.set('x-internal-i18n-rewrite', '1');
  return i18nRouter(req, i18nConfig);
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
