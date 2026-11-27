import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import RenderedPublicPage from '@/components/theme-engine/RenderedPublicPage';
import MissingTranslation from '@/components/i18n/MissingTranslation';
import PageClientWrapper from '@/components/PageClientWrapper';
import { resolveHomepageSlug } from '@/utils/resolveHomepageSlug';
import { getPageDataForSlug } from '@/utils/getPageData';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getSiteLanguageConfig, resolveRequestLocale } from '@/lib/i18n/siteLocale';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const [langConfig, locale] = await Promise.all([
    getSiteLanguageConfig(),
    resolveRequestLocale(),
  ]);
  const strictLocale = langConfig.multilingualEnabled;
  const slug = await resolveHomepageSlug(locale, { strictLocale });
  if (!slug) return { title: 'Home' };

  const pageData = await getPageDataForSlug(slug, locale, { strictLocale });
  if (!pageData?.metadata) return { title: 'Home' };

  return buildPageMetadata(
    {
      pageName: pageData.metadata.pageName,
      slug: pageData.metadata.slug || slug,
      description: pageData.metadata.description,
      seoName: pageData.metadata.seoName,
      seoMeta: pageData.metadata.seoMeta,
      isHome: true,
      updatedAt: pageData.metadata.updatedAt,
    },
    {
      isHome: true,
      locale: langConfig.multilingualEnabled ? locale : undefined,
      defaultLocale: langConfig.defaultLanguage,
    }
  );
}

/**
 * Site root (`/`) — renders whichever page is marked `isHome: true` in the CMS.
 * Falls back to a setup landing when no homepage exists.
 */
export default async function Home() {
  const langConfig = await getSiteLanguageConfig();
  const locale = await resolveRequestLocale(langConfig);
  const strictLocale = langConfig.multilingualEnabled;
  const slug = await resolveHomepageSlug(locale, { strictLocale });

  if (!slug) {
    if (strictLocale && locale !== langConfig.defaultLanguage) {
      return (
        <PageClientWrapper>
          <MissingTranslation
            locale={locale}
            defaultLocale={langConfig.defaultLanguage}
            enabledLanguages={langConfig.enabledLanguages}
            pageLabel="the homepage"
          />
        </PageClientWrapper>
      );
    }
    return <HomeClient />;
  }

  return <RenderedPublicPage slug={slug} locale={locale} />;
}
