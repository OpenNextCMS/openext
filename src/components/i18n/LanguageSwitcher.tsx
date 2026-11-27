'use client';

import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import {
  SITE_LOCALE_COOKIE,
  getLanguageLabel,
  withLocalePrefix,
} from '@/lib/i18n/siteLanguages';

type LangOption = { code: string; label: string };

type LanguageSwitcherProps = {
  currentLocale: string;
  defaultLocale: string;
  enabledLanguages: string[];
  translations?: { locale: string; slug: string; isHome?: boolean }[];
  currentSlug?: string;
  isHome?: boolean;
  className?: string;
};

/**
 * Site-wide language switch: sets cookie and reloads the site homepage in that
 * language so header, footer, menus, and pages all load for the new locale.
 */
export default function LanguageSwitcher({
  currentLocale,
  defaultLocale,
  enabledLanguages,
  className,
}: LanguageSwitcherProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const options: LangOption[] = useMemo(
    () =>
      enabledLanguages.map((code) => ({
        code,
        label: getLanguageLabel(code),
      })),
    [enabledLanguages]
  );

  if (!mounted || options.length < 2) return null;

  const onChange = (locale: string) => {
    if (!locale || locale === currentLocale) return;
    Cookies.set(SITE_LOCALE_COOKIE, locale, { expires: 365, path: '/' });
    // Always land on the locale homepage so the whole site context switches.
    window.location.assign(withLocalePrefix('/', locale, defaultLocale));
  };

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
      }}
      data-language-switcher="true"
    >
      <label htmlFor="site-language" className="sr-only">
        Website language
      </label>
      <select
        id="site-language"
        value={currentLocale}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select website language"
        style={{
          border: '1px solid rgba(0,0,0,0.15)',
          borderRadius: 6,
          padding: '4px 8px',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
