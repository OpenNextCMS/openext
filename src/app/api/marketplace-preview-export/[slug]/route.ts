import React from 'react';
import { NextResponse } from 'next/server';
import { buildMarketplacePreviewInput } from '@/modules/themeEngine/buildRenderInput';
import { previewBlocksFromLoadedTheme } from '@/modules/themeEngine/previewBlocksFromLoadedTheme';
import { themeLoader } from '@/modules/themeEngine/ThemeLoader';
import { templateResolver } from '@/modules/themeEngine/TemplateResolver';
import { assetManager } from '@/modules/themeEngine/AssetManager';
import { ThemeApiImpl } from '@/modules/themeEngine/ThemeAPI';
import { readDiskManifest } from '@/modules/themeEngine/readDiskManifest';
import { resolveCompanionScriptUrls } from '@/modules/themeEngine/companionScripts';
import ThemeScripts from '@/components/theme-engine/ThemeScripts';

export const dynamic = 'force-dynamic';

const PREVIEW_RESET_CSS = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    min-height: 100% !important;
  }
  [data-sonner-toaster], .Toastify, #nprogress { display: none !important; }
  [data-theme-engine-card-preview] {
    min-height: 100vh;
  }
`;

/**
 * Plain HTML export of a marketplace theme preview — used by the external
 * marketplace `export:previews` script (no RSC streaming payload).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  try {
    const diskManifest = await readDiskManifest(slug);
    if (!diskManifest) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

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

    const { renderToStaticMarkup } = await import('react-dom/server');
    const markup = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement('link', { rel: 'stylesheet', href: stylesheetUrl }),
        React.createElement('style', null, PREVIEW_RESET_CSS),
        React.createElement(
          'div',
          {
            'data-theme-engine-card-preview': slug,
            'data-theme-only': 'true',
            'data-compose': 'false',
          },
          React.createElement('div', { 'data-preview-part': 'header' }, header),
          React.createElement('div', { 'data-preview-part': 'body' }, body),
          React.createElement('div', { 'data-preview-part': 'footer' }, footer)
        ),
        React.createElement(ThemeScripts, { scriptUrl, companionScriptUrls })
      )
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${diskManifest.name} — Live Preview</title>
  <meta name="description" content="${diskManifest.name} — OpeNext Theme Engine static preview export" />
</head>
<body>
${markup}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[marketplace-preview-export]', slug, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
