import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageClientWrapper from '@/components/PageClientWrapper';
import PreviewBanner from '@/components/theme-engine/PreviewBanner';
import { getPageDataForSlug } from '@/utils/getPageData';
import { buildRenderInput } from '@/modules/themeEngine/buildRenderInput';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themePreviewService } from '@/modules/themeEngine/ThemePreviewService';
import { PREVIEW_COOKIE_NAME } from '@/modules/themeEngine/config';

export const revalidate = 30;

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pageData = await getPageDataForSlug(resolvedParams?.slug || '');

  return {
    title: pageData?.metadata?.pageName || `Page: ${resolvedParams?.slug ?? 'Unknown'}`,
    description: pageData?.metadata?.description || '',
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  if (!resolvedParams) return notFound();

  // The preview cookie is read HERE, in the route handler, and NOWHERE else —
  // ThemeRenderer/ThemeAPI never touch cookies themselves (spec §4.12).
  const cookieStore = await cookies();
  const previewToken = cookieStore.get(PREVIEW_COOKIE_NAME)?.value;
  const previewThemeSlug = previewToken
    ? ((await themePreviewService.getPreviewTheme(previewToken)) ?? undefined)
    : undefined;

  const input = await buildRenderInput(resolvedParams.slug, previewThemeSlug);
  if (!input) return notFound();

  const result = await themeManager.renderPage(input);

  return (
    <PageClientWrapper>
      <link rel="stylesheet" href={result.stylesheetUrl} />
      {previewThemeSlug ? <PreviewBanner slug={previewThemeSlug} /> : null}
      <div className="rendered-page">{result.element}</div>
      <script src={result.scriptUrl} defer />
    </PageClientWrapper>
  );
}
