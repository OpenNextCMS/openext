import { TemplateHierarchy, templateHierarchy } from './TemplateHierarchy';
import { TemplateResolutionError } from './errors';
import type { LoadedTheme, PageRenderContext, ThemeComponent } from './types';

/**
 * §4.8 TemplateResolver — combine `TemplateHierarchy`'s ordered key list with
 * a `LoadedTheme`'s ACTUAL available templates, and return the first match.
 *
 * Throwing `TemplateResolutionError` here (should be unreachable given
 * `ThemeValidator` guarantees `templates.index` exists — defended anyway) is
 * exactly what triggers `ThemeManager`'s default-theme fallback (§4.13).
 */
export class TemplateResolver {
  constructor(private readonly hierarchy: TemplateHierarchy = templateHierarchy) {}

  resolve(loadedTheme: LoadedTheme, context: PageRenderContext): ThemeComponent {
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
