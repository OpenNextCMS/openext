import React from 'react';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import { themeLoader, type ThemeLoader } from './ThemeLoader';
import { templateResolver, type TemplateResolver } from './TemplateResolver';
import { assetManager, type AssetManager } from './AssetManager';
import { ThemeApiImpl } from './ThemeAPI';
import { resolveThemeSettingValues } from './bridges/settingsBridge';
import { ThemeEngineError, ThemeRenderError } from './errors';
import type { PageRenderContext, RenderInput, RenderResult } from './types';

/**
 * §4.10 ThemeRenderer — orchestrate ONE full page render using the active
 * (or previewed) theme.
 *
 * Flow: resolve theme slug (preview vs active) -> ThemeLoader.loadTheme() ->
 * TemplateResolver.resolve() -> build a fresh ThemeAPI -> render
 * Header/Template/Footer -> return the composed element + asset URLs.
 *
 * This class does ONE attempt and either returns a `RenderResult` or throws.
 * The "automatically switch to the default theme on failure" policy is
 * explicitly NOT here — that's `ThemeManager`'s job (spec §4.13); this class
 * only guarantees that whatever it throws is a typed `ThemeEngineError` so
 * the manager can decide to retry rather than parse error strings. Already-
 * typed errors from deeper modules (e.g. `TemplateResolutionError`,
 * `ThemeLoadError`) propagate AS-IS, unwrapped, so the manager keeps the
 * specific failure `code`; only a genuinely unexpected error gets wrapped in
 * a new `ThemeRenderError`.
 */
export class ThemeRenderer {
  constructor(
    private readonly registry: ThemeRegistry = themeRegistry,
    private readonly loader: ThemeLoader = themeLoader,
    private readonly resolver: TemplateResolver = templateResolver,
    private readonly assets: AssetManager = assetManager
  ) {}

  async render(input: RenderInput): Promise<RenderResult> {
    let slug: string | undefined;
    try {
      slug = input.previewThemeSlug ?? (await this.registry.getActive())?.slug ?? undefined;
      if (!slug) {
        throw new ThemeRenderError('(none)', 'no active theme is set and no preview theme was requested.');
      }

      const loaded = await this.loader.loadTheme(slug);

      const context: PageRenderContext = {
        pageType: input.page.type,
        customTemplateKey: input.page.templateKey as string | undefined,
      };
      const Template = this.resolver.resolve(loaded, context); // throws TemplateResolutionError, propagated as-is

      const themeSettingValues = await resolveThemeSettingValues(loaded.manifest.slug);
      const api = new ThemeApiImpl({ input, loadedTheme: loaded, themeSettingValues, assets: this.assets });

      const element = React.createElement(
        React.Fragment,
        null,
        api.header(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.createElement(Template as any, { theme: api }),
        api.footer()
      );

      return {
        element,
        stylesheetUrl: this.assets.getStylesheetUrl(loaded.manifest.slug, loaded.manifest.version),
        scriptUrl: this.assets.getScriptUrl(loaded.manifest.slug, loaded.manifest.version),
        usedFallback: false,
      };
    } catch (err) {
      if (err instanceof ThemeEngineError) throw err;
      throw new ThemeRenderError(slug ?? '(unknown)', err instanceof Error ? err.message : String(err), err);
    }
  }
}

/** Convenience singleton. */
export const themeRenderer = new ThemeRenderer();
