import type { PageRenderContext } from './types';

/**
 * §4.7 TemplateHierarchy — pure resolution logic: given a requested page's
 * type/context, return the ORDERED list of template keys to try.
 *
 * No I/O, no knowledge of what a theme actually declares — that's
 * `TemplateResolver`'s job (§4.8), which combines this order with a
 * `LoadedTheme`'s real `templates` map.
 *
 * Rule (spec §4.7): always ends in `"index"` — `ThemeValidator` guarantees
 * `templates.index` exists on every installed theme, so it is always a safe
 * final fallback.
 */

/** Base fallback chain per page type, BEFORE the `index` fallback is appended. */
const BASE_CHAIN: Record<PageRenderContext['pageType'], string[]> = {
  home: ['home', 'page'],
  page: ['page'],
  post: ['post', 'page'],
  archive: ['archive'],
  custom: ['page'],
};

export class TemplateHierarchy {
  resolveOrder(context: PageRenderContext): string[] {
    const chain: string[] = [];
    if (context.customTemplateKey) chain.push(context.customTemplateKey);
    chain.push(...BASE_CHAIN[context.pageType]);

    // De-dupe (preserving first occurrence), then force "index" to the END
    // regardless of where it landed above — even the pathological case of a
    // theme naming a custom key "index" must not move it out of last place.
    const deduped = Array.from(new Set(chain)).filter((key) => key !== 'index');
    deduped.push('index');
    return deduped;
  }
}

/** Convenience singleton — stateless and pure. */
export const templateHierarchy = new TemplateHierarchy();
