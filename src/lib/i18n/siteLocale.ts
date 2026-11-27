import { cookies, headers } from 'next/headers';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import { getOrLoadCached, settingsCacheTtlMs } from '@/lib/cache/settingsCache';
import {
  DEFAULT_SITE_LOCALE,
  MULTILINGUAL_COOKIE,
  SITE_LOCALE_COOKIE,
  normalizeLocale,
  isKnownSiteLocale,
  withLocalePrefix,
} from './siteLanguages';

export interface SiteLanguageConfig {
  defaultLanguage: string;
  enabledLanguages: string[];
  multilingualEnabled: boolean;
}

const FALLBACK_CONFIG: SiteLanguageConfig = {
  defaultLanguage: DEFAULT_SITE_LOCALE,
  enabledLanguages: [DEFAULT_SITE_LOCALE],
  multilingualEnabled: false,
};

/** Load public-site language settings from the CMS Settings document (TTL-cached). */
export async function getSiteLanguageConfig(): Promise<SiteLanguageConfig> {
  try {
    return await getOrLoadCached('site-language-config', settingsCacheTtlMs(), async () => {
      await getUserDbConnection();
      const Settings = getSettingsModel();
      const doc = (await Settings.findOne({})
        .select('language enabledLanguages multilingualEnabled')
        .lean()
        .exec()) as {
        language?: string;
        enabledLanguages?: string[];
        multilingualEnabled?: boolean;
      } | null;

      const defaultLanguage = normalizeLocale(doc?.language, DEFAULT_SITE_LOCALE);
      const rawEnabled = Array.isArray(doc?.enabledLanguages)
        ? doc!.enabledLanguages!.map((c) => normalizeLocale(c, defaultLanguage))
        : [defaultLanguage];
      const enabledLanguages = [...new Set([defaultLanguage, ...rawEnabled])].filter(
        isKnownSiteLocale
      );
      const multilingualEnabled = !!doc?.multilingualEnabled && enabledLanguages.length > 1;

      return {
        defaultLanguage,
        enabledLanguages: enabledLanguages.length ? enabledLanguages : [defaultLanguage],
        multilingualEnabled,
      };
    });
  } catch {
    return FALLBACK_CONFIG;
  }
}

/**
 * Resolve the active request locale from proxy header, cookie, then site default.
 */
export async function resolveRequestLocale(
  config?: SiteLanguageConfig
): Promise<string> {
  const cfg = config || (await getSiteLanguageConfig());
  const headerStore = await headers();
  const fromHeader = headerStore.get('x-site-locale');
  if (fromHeader && cfg.enabledLanguages.includes(fromHeader)) {
    return fromHeader;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SITE_LOCALE_COOKIE)?.value;
  if (fromCookie && cfg.enabledLanguages.includes(fromCookie)) {
    return fromCookie;
  }

  return cfg.defaultLanguage;
}

export { SITE_LOCALE_COOKIE, MULTILINGUAL_COOKIE, withLocalePrefix };
