import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_SITE_LOCALE,
  RESERVED_PATH_PREFIXES,
  SITE_LOCALE_COOKIE,
  isKnownSiteLocale,
} from '@/lib/i18n/siteLanguages';

const restrictedRoutes = [
  '/language',
  '/database-choice',
  '/mongodb-setup',
  '/mongodb-setup/database-setup',
  '/mysql-setup',
  '/postgres-setup',
  '/admin',
];

function stripLocalePrefix(pathname: string): { locale: string | null; rest: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { locale: null, rest: '/' };
  const maybe = parts[0];
  if (!isKnownSiteLocale(maybe) || RESERVED_PATH_PREFIXES.has(maybe)) {
    return { locale: null, rest: pathname };
  }
  const restParts = parts.slice(1);
  return { locale: maybe, rest: restParts.length ? `/${restParts.join('/')}` : '/' };
}

/**
 * Next.js 16 network boundary (replaces deprecated `middleware.ts`).
 * Runs on the Node.js runtime.
 */
export async function proxy(request: NextRequest) {
  const dbConnection = request.cookies.get('dbConnection')?.value === 'true';
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  // Public multilingual prefixes: /hi, /hi/about → rewrite without prefix + set locale cookie.
  // Always rewrite known locale codes so shared links work before any cookie is set.
  if (dbConnection) {
    const { locale, rest } = stripLocalePrefix(currentPath);
    if (locale) {
      const url = request.nextUrl.clone();
      url.pathname = rest;
      const response = NextResponse.rewrite(url);
      response.cookies.set(SITE_LOCALE_COOKIE, locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      response.headers.set('x-site-locale', locale);
      return response;
    }
  }

  if (currentPath === '/') {
    if (!dbConnection) {
      return NextResponse.redirect(new URL('/language', request.url));
    }
    const locale =
      request.cookies.get(SITE_LOCALE_COOKIE)?.value || DEFAULT_SITE_LOCALE;
    const response = NextResponse.next();
    if (isKnownSiteLocale(locale)) {
      response.headers.set('x-site-locale', locale);
    }
    return response;
  }

  if (dbConnection && restrictedRoutes.includes(currentPath)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('message', 'Super admin is created\n path is restricted', {
      path: '/',
    });
    return response;
  }

  if (token) {
    if (currentPath === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    const response = NextResponse.next();
    const locale = request.cookies.get(SITE_LOCALE_COOKIE)?.value;
    if (locale && isKnownSiteLocale(locale)) {
      response.headers.set('x-site-locale', locale);
    }
    return response;
  }

  const locale = request.cookies.get(SITE_LOCALE_COOKIE)?.value;
  if (locale && isKnownSiteLocale(locale)) {
    const response = NextResponse.next();
    response.headers.set('x-site-locale', locale);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/language',
    '/database-choice',
    '/mongodb-setup',
    '/mongodb-setup/database-setup',
    '/mysql-setup',
    '/postgres-setup',
    '/admin',
    '/dashboard/:path*',
    '/login',
    // Locale-prefixed public paths (e.g. /hi/about) + other public pages
    '/((?!_next/static|_next/image|favicon.ico|api|uploads|siteicon|themes).*)',
  ],
};
