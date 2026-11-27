import { getLanguageLabel } from '@/lib/i18n/siteLanguages';
import { withLocalePrefix } from '@/lib/i18n/siteLanguages';

type MissingTranslationProps = {
  locale: string;
  defaultLocale: string;
  enabledLanguages?: string[];
  pageLabel?: string;
};

/** Shown when a locale is selected but no translated page exists yet. */
export default function MissingTranslation({
  locale,
  defaultLocale,
  pageLabel = 'this page',
}: MissingTranslationProps) {
  const label = getLanguageLabel(locale);
  const homeHref = withLocalePrefix('/', defaultLocale, defaultLocale);

  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>Translation not available</h1>
      <p style={{ maxWidth: 480, color: '#555', margin: 0, lineHeight: 1.5 }}>
        There is no <strong>{label}</strong> version of {pageLabel} yet. Return to the
        default language, or ask an administrator to publish content for this language.
      </p>
      <a
        href={homeHref}
        style={{
          marginTop: 8,
          padding: '10px 16px',
          borderRadius: 8,
          background: '#111',
          color: '#fff',
          textDecoration: 'none',
          fontSize: 14,
        }}
      >
        Back to default language
      </a>
    </div>
  );
}
