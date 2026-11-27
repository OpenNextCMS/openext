import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import PageClientWrapper from '@/components/PageClientWrapper';
import EditThisPageButton from '@/components/public/EditThisPageButton';
import ThemeScripts from '@/components/theme-engine/ThemeScripts';
import PreviewBanner from '@/components/theme-engine/PreviewBanner';
import ThemeRenderBoundary from '@/components/theme-engine/ThemeRenderBoundary';
import SiteChromeLayout from '@/components/layout/SiteChromeLayout';
import MissingTranslation from '@/components/i18n/MissingTranslation';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { getAuthUser } from '@/lib/api/auth';
import { buildRenderInput } from '@/modules/themeEngine/buildRenderInput';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themePreviewService } from '@/modules/themeEngine/ThemePreviewService';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { PREVIEW_COOKIE_NAME, DEFAULT_THEME_SLUG } from '@/modules/themeEngine/config';
import { isThemeEngineCanvas } from '@/modules/themeEngine/bridges/pageBridge';
import { getPageDataForSlug } from '@/utils/getPageData';
import { getSiteLanguageConfig, resolveRequestLocale } from '@/lib/i18n/siteLocale';
import { DEFAULT_SITE_LOCALE } from '@/lib/i18n/siteLanguages';
import type { BlockData } from '@/types/index';

interface RenderedPublicPageProps {
  slug: string;
  locale?: string;
}

/**
 * Shared public render for `/` and `/[slug]`.
 *
 * Classic CMS pages (after removing a Theme Engine frame in the editor) render
 * with site header/footer when only the built-in default theme is active — so
 * `/` does not flash the default-theme Welcome/fallback chrome first.
 * Theme Engine canvases and non-default active themes still use the package path.
 */
export default async function RenderedPublicPage({
  slug,
  locale: localeProp,
}: RenderedPublicPageProps) {
  const cookieStore = await cookies();
  const previewToken = cookieStore.get(PREVIEW_COOKIE_NAME)?.value;
  const previewThemeSlug = previewToken
    ? ((await themePreviewService.getPreviewTheme(previewToken)) ?? undefined)
    : undefined;

  const langConfig = await getSiteLanguageConfig();
  const locale = localeProp || (await resolveRequestLocale(langConfig));
  const strictLocale = langConfig.multilingualEnabled;

  const pageData = await getPageDataForSlug(slug, locale, { strictLocale });

  if (!pageData) {
    if (strictLocale && locale !== langConfig.defaultLanguage) {
      return (
        <PageClientWrapper>
          <MissingTranslation
            locale={locale}
            defaultLocale={langConfig.defaultLanguage}
            enabledLanguages={langConfig.enabledLanguages}
            pageLabel={`“${slug}”`}
          />
        </PageClientWrapper>
      );
    }
    notFound();
  }

  const pageLocale = pageData.metadata.locale || DEFAULT_SITE_LOCALE;
  if (strictLocale && pageLocale !== locale) {
    return (
      <PageClientWrapper>
        <MissingTranslation
          locale={locale}
          defaultLocale={langConfig.defaultLanguage}
          enabledLanguages={langConfig.enabledLanguages}
          pageLabel={`“${pageData.metadata.pageName || slug}”`}
        />
      </PageClientWrapper>
    );
  }

  const authUser = await getAuthUser();
  const editPageSlug = String(pageData.metadata.slug || slug).trim();
  const editPageId = pageData.metadata._id ? String(pageData.metadata._id) : '';
  const editThisPage =
    authUser?.userId && editPageId && editPageSlug ? (
      <EditThisPageButton
        pageSlug={editPageSlug}
        pageId={editPageId}
        userId={String(authUser.userId)}
        pageName={pageData.metadata.pageName}
        pageType={pageData.metadata.pageType === 'header' || pageData.metadata.pageType === 'footer' ? pageData.metadata.pageType : 'page'}
      />
    ) : null;

  const activeTheme = await themeRegistry.getActive();
  const activeThemeSlug = previewThemeSlug ?? activeTheme?.slug ?? undefined;
  const themeCanvas = isThemeEngineCanvas(pageData.blocks);

  const useClassicCms =
    !previewThemeSlug &&
    !themeCanvas &&
    (!activeThemeSlug || activeThemeSlug === DEFAULT_THEME_SLUG);

  if (useClassicCms) {
    return (
      <PageClientWrapper>
        <div className="rendered-page" data-render-mode="classic-cms">
          <SiteChromeLayout
            headerBlocks={pageData.headerBlocks as BlockData[]}
            footerBlocks={pageData.footerBlocks as BlockData[]}
          >
            <main>
              {(pageData.blocks as BlockData[]).map((block) => (
                <div key={block.uniqueId || block.id}>{renderFromJson(block)}</div>
              ))}
            </main>
          </SiteChromeLayout>
        </div>
        {editThisPage}
      </PageClientWrapper>
    );
  }

  const input = await buildRenderInput(slug, previewThemeSlug, locale, {
    strictLocale,
    pageData,
  });
  if (!input) {
    if (strictLocale && locale !== langConfig.defaultLanguage) {
      return (
        <PageClientWrapper>
          <MissingTranslation
            locale={locale}
            defaultLocale={langConfig.defaultLanguage}
            enabledLanguages={langConfig.enabledLanguages}
            pageLabel={`“${slug}”`}
          />
        </PageClientWrapper>
      );
    }
    notFound();
  }

  const result = await themeManager.renderPage(input);
  const isCoffeeParallax = activeThemeSlug === 'coffee-parallax';
  const previewThemeDoc = previewThemeSlug
    ? await themeRegistry.getBySlug(previewThemeSlug)
    : null;

  return (
    <PageClientWrapper>
      <link rel="stylesheet" href={result.stylesheetUrl} />
      {isCoffeeParallax ? (
        <style>{`
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100% !important;
          }
          body {
            overflow-x: hidden;
          }
        `}</style>
      ) : null}
      {previewThemeSlug ? (
        <PreviewBanner slug={previewThemeSlug} themeName={previewThemeDoc?.name} />
      ) : null}
      {result.usedFallback ? (
        <p
          data-theme-engine-fallback-notice="true"
          style={{
            padding: '8px 16px',
            fontSize: 13,
            background: '#fef3c7',
            color: '#92400e',
            margin: 0,
          }}
        >
          This page is showing the default fallback theme because the active theme failed to
          render.
        </p>
      ) : null}
      <ThemeRenderBoundary>
        <div className="rendered-page" data-theme-slug={activeThemeSlug}>
          {result.element}
        </div>
      </ThemeRenderBoundary>
      <ThemeScripts scriptUrl={result.scriptUrl} companionScriptUrls={result.companionScriptUrls} />
      {editThisPage}
    </PageClientWrapper>
  );
}
