import type { PageRenderContext, PageContentType } from './types';

/**
 * §4.7 TemplateHierarchy — pure resolution logic: given a requested page's
 * type/context, return the ORDERED list of template keys to try.
 */

/** Base fallback chain per page type, BEFORE the `index` fallback is appended. */
const BASE_CHAIN: Record<PageContentType, string[]> = {
  home: ['home', 'page'],
  page: ['page'],
  post: ['post', 'blogPost', 'page'],
  archive: ['archive'],
  custom: ['page'],
  product: ['product', 'single', 'page'],
  products: ['products', 'archive', 'page'],
  category: ['category', 'archive', 'page'],
  blog: ['blog', 'archive', 'page'],
  blogPost: ['blogPost', 'post', 'single', 'page'],
  search: ['search', 'archive', 'page'],
  error: ['404', 'error', 'page'],
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
