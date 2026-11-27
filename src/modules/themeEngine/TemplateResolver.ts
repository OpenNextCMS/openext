import { TemplateHierarchy, templateHierarchy } from './TemplateHierarchy';
import { resolvePageTemplateKey } from './pageTemplateResolver';
import { TemplateResolutionError } from './errors';
import type { LoadedTheme, PageRenderContext, ThemeComponent, ThemeManifest } from './types';

/**
 * §4.8 TemplateResolver — combine centralized page template resolution with
 * a `LoadedTheme`'s ACTUAL available templates, and return the first match.
 */
export class TemplateResolver {
  constructor(private readonly hierarchy: TemplateHierarchy = templateHierarchy) {}

  resolve(
    loadedTheme: LoadedTheme,
    context: PageRenderContext,
    opts?: { manifest?: ThemeManifest; pageSlug?: string; homepageTemplateKey?: string | null }
  ): ThemeComponent {
    const manifest = opts?.manifest ?? loadedTheme.manifest;

    // When we have full page context, use centralized resolver first
    if (opts?.manifest || context.customTemplateKey) {
      const key = resolvePageTemplateKey({
        page: {
          id: '',
          slug: opts?.pageSlug ?? '',
          title: '',
          type: context.pageType,
          templateKey: context.customTemplateKey,
        },
        manifest,
        homepageTemplateKey: opts?.homepageTemplateKey,
      });
      const direct = loadedTheme.templates[key];
      if (direct) return direct;
    }

    const tried = this.hierarchy.resolveOrder(context);
    for (const key of tried) {
      const component = loadedTheme.templates[key];
      if (component) return component;
    }
    throw new TemplateResolutionError(loadedTheme.manifest.slug, tried);
  }
}

/** Convenience singleton. */
export const templateResolver = new TemplateResolver();
