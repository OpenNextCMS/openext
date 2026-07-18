import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import PageClientWrapper from '@/components/PageClientWrapper';
import PreviewBanner from '@/components/theme-engine/PreviewBanner';
import ThemeRenderBoundary from '@/components/theme-engine/ThemeRenderBoundary';
import { TemplateThemeRenderer } from '@/modules/theme/services/TemplateThemeRenderer';
import { buildRenderInput } from '@/modules/themeEngine/buildRenderInput';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { themePreviewService } from '@/modules/themeEngine/ThemePreviewService';
import { PREVIEW_COOKIE_NAME } from '@/modules/themeEngine/config';
import { getPageDbConnection, getPageModel, getWebsitePreferencesModel } from '@/utils/db';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

async function resolveHomepageSlug(): Promise<string | null> {
  try {
    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);

    const home = await Page.findOne({ isHome: true, pageType: 'page', isPublished: true })
      .select('slug')
      .lean()
      .exec();
    if (home && typeof (home as { slug?: string }).slug === 'string') {
      return (home as { slug: string }).slug;
    }

    try {
      const Prefs = getWebsitePreferencesModel(pageDb);
      const prefs = await Prefs.findOne({}).lean().exec();
      const homepageSlug = (prefs as { homepageSlug?: string } | null)?.homepageSlug;
      if (homepageSlug) return homepageSlug;
    } catch {
      // optional
    }

    const bySlug = await Page.findOne({ slug: 'home', pageType: 'page' }).select('slug').lean().exec();
    if (bySlug) return 'home';
  } catch {
    return null;
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const slug = await resolveHomepageSlug();
  if (!slug) return { title: 'Home' };
  const input = await buildRenderInput(slug);
  return {
    title: input?.page.title || 'Home',
    description: '',
  };
}

/**
 * Site root.
 * Priority:
 * 1. Active Theme Engine (Beta) package — exact Header/Template/Footer
 * 2. Legacy WordPress-style template theme iframe
 * 3. Default block-theme ThemeLoader home
 */
export default async function Home() {
  const cookieStore = await cookies();
  const previewToken = cookieStore.get(PREVIEW_COOKIE_NAME)?.value;
  const previewThemeSlug = previewToken
    ? ((await themePreviewService.getPreviewTheme(previewToken)) ?? undefined)
    : undefined;

  const active = previewThemeSlug ? { slug: previewThemeSlug } : await themeRegistry.getActive();

  if (active?.slug) {
    const homepageSlug = (await resolveHomepageSlug()) || 'home';
    const input = await buildRenderInput(homepageSlug, previewThemeSlug || active.slug);
    if (input) {
      const result = await themeManager.renderPage({
        ...input,
        previewThemeSlug: previewThemeSlug || active.slug,
      });
      return (
        <PageClientWrapper>
          <link rel="stylesheet" href={result.stylesheetUrl} />
          {previewThemeSlug ? <PreviewBanner slug={previewThemeSlug} /> : null}
          <ThemeRenderBoundary>
            <div className="rendered-page">{result.element}</div>
          </ThemeRenderBoundary>
          <script src={result.scriptUrl} defer />
        </PageClientWrapper>
      );
    }
  }

  const templateTheme = await TemplateThemeRenderer.getActive();
  if (templateTheme) {
    return (
      <iframe
        src="/api/site/render?path="
        title={templateTheme.name}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
      />
    );
  }

  return <HomeClient />;
}
