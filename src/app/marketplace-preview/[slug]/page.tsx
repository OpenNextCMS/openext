import React from 'react';
import { notFound } from 'next/navigation';
import { buildMarketplacePreviewInput } from '@/modules/themeEngine/buildRenderInput';
import { previewBlocksFromLoadedTheme } from '@/modules/themeEngine/previewBlocksFromLoadedTheme';
import { themeLoader } from '@/modules/themeEngine/ThemeLoader';
import { templateResolver } from '@/modules/themeEngine/TemplateResolver';
import { assetManager } from '@/modules/themeEngine/AssetManager';
import { ThemeApiImpl } from '@/modules/themeEngine/ThemeAPI';
import { readDiskManifest } from '@/modules/themeEngine/readDiskManifest';
import { resolveCompanionScriptUrls } from '@/modules/themeEngine/companionScripts';
import ThemeScripts from '@/components/theme-engine/ThemeScripts';
import MarketplacePreviewUnavailable from '@/components/theme-engine/MarketplacePreviewUnavailable';

export const dynamic = 'force-dynamic';

/**
 * Public, read-only Theme Engine preview for the external marketplace.
 * Loads themes directly from disk — no auth or MongoDB install record required.
 */
export default async function MarketplaceThemePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ compose?: string }>;
}) {
  const { slug } = await params;
  const query = (await searchParams) || {};
  const compose = query.compose === '1' || query.compose === 'true';

  const diskManifest = await readDiskManifest(slug);
  if (!diskManifest) notFound();

  try {
    const loaded = await themeLoader.loadThemeForMarketplacePreview(slug);
    const input = {
      ...(await buildMarketplacePreviewInput(slug)),
      blocks: previewBlocksFromLoadedTheme(loaded),
    };
    const Template = templateResolver.resolve(loaded, {
      pageType: input.page.type,
      customTemplateKey: input.page.templateKey as string | undefined,
    });
    const api = new ThemeApiImpl({
      input,
      loadedTheme: loaded,
      themeSettingValues: {},
      assets: assetManager,
    });

    const stylesheetUrl = assetManager.getStylesheetUrl(
      loaded.manifest.slug,
      loaded.manifest.version
    );
    const scriptUrl = assetManager.getScriptUrl(loaded.manifest.slug, loaded.manifest.version);
    const companionScriptUrls = await resolveCompanionScriptUrls(loaded.manifest.slug, scriptUrl);

    const header = api.header();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = React.createElement(Template as any, { theme: api });
    const footer = api.footer();

    return (
      <>
        <link rel="stylesheet" href={stylesheetUrl} />
        <style>{`
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100% !important;
          }
          [data-sonner-toaster], .Toastify, #nprogress { display: none !important; }

          [data-theme-engine-card-preview] {
            min-height: 100vh;
          }

          [data-theme-engine-card-preview][data-compose="true"] {
            display: flex;
            flex-direction: column;
            height: 100vh;
            min-height: 100vh;
            overflow: hidden;
          }
          [data-theme-engine-card-preview][data-compose="true"] [data-preview-part="header"],
          [data-theme-engine-card-preview][data-compose="true"] [data-preview-part="footer"] {
            flex: 0 0 auto;
            position: relative;
            z-index: 2;
          }
          [data-theme-engine-card-preview][data-compose="true"] [data-preview-part="body"] {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
          }
        `}</style>
        <div
          data-theme-engine-card-preview={slug}
          data-theme-only="true"
          data-compose={compose ? 'true' : 'false'}
        >
          <div data-preview-part="header">{header}</div>
          <div data-preview-part="body">{body}</div>
          <div data-preview-part="footer">{footer}</div>
        </div>
        <ThemeScripts scriptUrl={scriptUrl} companionScriptUrls={companionScriptUrls} />
      </>
    );
  } catch (err) {
    console.error('[marketplace-preview]', slug, err);
    return (
      <MarketplacePreviewUnavailable
        slug={slug}
        themeName={diskManifest.name}
        message={err instanceof Error ? err.message : 'Preview failed to render'}
      />
    );
  }
}
