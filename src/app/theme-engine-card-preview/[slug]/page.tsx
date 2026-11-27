import React from 'react';
import { notFound } from 'next/navigation';
import { getAuthUser } from '@/lib/api/auth';
import { buildCardPreviewInput } from '@/modules/themeEngine/buildRenderInput';
import { previewBlocksFromLoadedTheme } from '@/modules/themeEngine/previewBlocksFromLoadedTheme';
import { themeLoader } from '@/modules/themeEngine/ThemeLoader';
import { templateResolver } from '@/modules/themeEngine/TemplateResolver';
import { assetManager } from '@/modules/themeEngine/AssetManager';
import { ThemeApiImpl } from '@/modules/themeEngine/ThemeAPI';
import { resolveThemeSettingValues } from '@/modules/themeEngine/bridges/settingsBridge';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { resolveCompanionScriptUrls } from '@/modules/themeEngine/companionScripts';
import ThemeScripts from '@/components/theme-engine/ThemeScripts';

export const dynamic = 'force-dynamic';

/**
 * Theme-only preview for gallery cards / live preview / “Open full preview”.
 * Renders Header + Home/Index template + Footer with theme CSS + theme.js.
 * Seeds editableSections (schema defaults) so full preview shows every section,
 * not only a template fallback hero.
 */
export default async function ThemeEngineCardPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ compose?: string; template?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) notFound();

  const { slug } = await params;
  const query = (await searchParams) || {};
  const compose = query.compose === '1' || query.compose === 'true';
  const templateKey = typeof query.template === 'string' ? query.template.trim() : '';

  const theme = await themeRegistry.getBySlug(slug);
  if (!theme || theme.status !== 'installed') notFound();

  const templatesMeta = Array.isArray(theme.templates) ? theme.templates : theme.manifest.templateRegistry ?? [];
  const templateMeta = templatesMeta.find((t) => t.key === templateKey);

  try {
    const loaded = await themeLoader.loadTheme(slug);
    const input = {
      ...(await buildCardPreviewInput(slug, {
        templateKey: templateKey || undefined,
        templateType: templateMeta?.type,
        title: templateMeta?.name,
      })),
      blocks: previewBlocksFromLoadedTheme(loaded),
    };
    const Template = templateResolver.resolve(
      loaded,
      {
        pageType: input.page.type,
        customTemplateKey: templateKey || undefined,
      },
      { manifest: loaded.manifest, pageSlug: input.page.slug }
    );
    const themeSettingValues = await resolveThemeSettingValues(loaded.manifest.slug);
    const api = new ThemeApiImpl({
      input,
      loadedTheme: loaded,
      themeSettingValues,
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
            background: var(--ct-bg, var(--theme-bg, #ffffff)) !important;
            color: var(--ct-text, var(--theme-text, inherit)) !important;
          }
          [data-sonner-toaster], .Toastify, #nprogress { display: none !important; }

          [data-theme-engine-card-preview] {
            min-height: 100vh;
            background: var(--ct-bg, var(--theme-bg, #ffffff));
            color: var(--ct-text, var(--theme-text, inherit));
          }

          /* Gallery card mode: keep package header + footer always visible */
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
          data-preview-sections={String(input.blocks.length)}
        >
          <div data-preview-part="header">{header}</div>
          <div data-preview-part="body">{body}</div>
          <div data-preview-part="footer">{footer}</div>
        </div>
        <ThemeScripts scriptUrl={scriptUrl} companionScriptUrls={companionScriptUrls} />
      </>
    );
  } catch (err) {
    console.error('[theme-engine-card-preview]', slug, err);
    notFound();
  }
}
