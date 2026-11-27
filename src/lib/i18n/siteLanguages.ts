import { languageNames } from '../../../public/locales/translations';

/** Catalog of languages the CMS can offer for the public site. */
export const SITE_LANGUAGE_CODES = Object.keys(languageNames) as string[];

export const SITE_LANGUAGE_OPTIONS = SITE_LANGUAGE_CODES.map((code) => ({
  code,
  label: languageNames[code as keyof typeof languageNames] || code,
}));

export const RTL_LOCALES = new Set(['ar']);

export const SITE_LOCALE_COOKIE = 'siteLocale';
export const MULTILINGUAL_COOKIE = 'siteMultilingual';

export const DEFAULT_SITE_LOCALE = 'en';

/** Paths that must never be treated as a public locale prefix. */
export const RESERVED_PATH_PREFIXES = new Set([
  'api',
  'dashboard',
  'login',
  'admin',
  'language',
  'database-choice',
  'mongodb-setup',
  'mysql-setup',
  'postgres-setup',
  'onboarding',
  'editor',
  'Editor',
  'doc',
  'plugins',
  'siteicon',
  'uploads',
  'themes',
  '_next',
  'favicon.ico',
]);

export function isKnownSiteLocale(code: string | null | undefined): boolean {
  if (!code) return false;
  return SITE_LANGUAGE_CODES.includes(code);
}

export function isRtlLocale(code: string | null | undefined): boolean {
  return !!code && RTL_LOCALES.has(code);
}

export function normalizeLocale(code: string | null | undefined, fallback = DEFAULT_SITE_LOCALE): string {
  const c = (code || '').trim().toLowerCase();
  return isKnownSiteLocale(c) ? c : fallback;
}

export function getLanguageLabel(code: string): string {
  return languageNames[code as keyof typeof languageNames] || code;
}

/** Prefix a public path with a locale when it is not the site default. */
export function withLocalePrefix(path: string, locale: string, defaultLocale: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!locale || locale === defaultLocale) return clean === '' ? '/' : clean;
  if (clean === '/') return `/${locale}`;
  return `/${locale}${clean}`;
}
