import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RenderedPublicPage from '@/components/theme-engine/RenderedPublicPage';
import { getPageDataForSlug } from '@/utils/getPageData';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getSiteLanguageConfig, resolveRequestLocale } from '@/lib/i18n/siteLocale';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params?: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';
  const [langConfig, locale] = await Promise.all([
    getSiteLanguageConfig(),
    resolveRequestLocale(),
  ]);
  const strictLocale = langConfig.multilingualEnabled;
  const pageData = await getPageDataForSlug(slug, locale, { strictLocale });

  if (!pageData?.metadata) {
    return { title: `Page: ${slug || 'Unknown'}` };
  }

  return buildPageMetadata(
    {
      pageName: pageData.metadata.pageName,
      slug: pageData.metadata.slug || slug,
      description: pageData.metadata.description,
      seoName: pageData.metadata.seoName,
      seoMeta: pageData.metadata.seoMeta,
      isHome: pageData.metadata.isHome,
      updatedAt: pageData.metadata.updatedAt,
    },
    {
      locale: langConfig.multilingualEnabled ? locale : undefined,
      defaultLocale: langConfig.defaultLanguage,
    }
  );
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug?.trim();
  if (!slug) notFound();

  const locale = await resolveRequestLocale();
  return <RenderedPublicPage slug={slug} locale={locale} />;
}
