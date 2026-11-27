import type { CmsPage, LoadedTheme, PageContentType, ThemeManifest } from './types';
import { templateHierarchy } from './TemplateHierarchy';

/**
 * Content-type → default template key mapping.
 * Only returns a key when that template exists in the active theme manifest.
 */
const CONTENT_TYPE_DEFAULTS: Record<PageContentType, string[]> = {
  home: ['home', 'page', 'index'],
  page: ['page', 'index'],
  post: ['post', 'blogPost', 'page', 'index'],
  archive: ['archive', 'index'],
  custom: ['page', 'index'],
  product: ['product', 'single', 'page', 'index'],
  products: ['products', 'archive', 'page', 'index'],
  category: ['category', 'archive', 'page', 'index'],
  blog: ['blog', 'archive', 'page', 'index'],
  blogPost: ['blogPost', 'post', 'single', 'page', 'index'],
  search: ['search', 'archive', 'page', 'index'],
  error: ['404', 'error', 'page', 'index'],
};

export interface TemplateResolutionInput {
  page: CmsPage;
  manifest: ThemeManifest;
  /** Site-wide homepage template override (from theme_engine_settings). */
  homepageTemplateKey?: string | null;
}

/** Returns the first template key that exists in the manifest's templates map. */
export function pickExistingTemplate(manifest: ThemeManifest, candidates: string[]): string | null {
  for (const key of candidates) {
    const path = manifest.templates[key];
    if (typeof path === 'string' && path.length > 0) return key;
  }
  return null;
}

/**
 * Centralized template resolution — determines which template KEY to use
 * before TemplateResolver loads the component.
 */
export function resolvePageTemplateKey(input: TemplateResolutionInput): string {
  const { page, manifest, homepageTemplateKey } = input;
  const available = new Set(
    Object.entries(manifest.templates)
      .filter(([, p]) => typeof p === 'string' && p.length > 0)
      .map(([k]) => k)
  );

  // 1. Page-assigned template
  if (page.templateKey && available.has(page.templateKey)) {
    return page.templateKey;
  }

  // 2. Homepage site setting override
  if (page.type === 'home' && homepageTemplateKey && available.has(homepageTemplateKey)) {
    return homepageTemplateKey;
  }

  // 3. Content-type defaults (only if template exists)
  const typeDefaults = CONTENT_TYPE_DEFAULTS[page.type] ?? CONTENT_TYPE_DEFAULTS.page;
  for (const key of typeDefaults) {
    if (available.has(key)) return key;
  }

  // 4. Hierarchy fallback (index guaranteed by validator)
  const order = templateHierarchy.resolveOrder({
    pageType: page.type,
    customTemplateKey: page.templateKey,
  });
  for (const key of order) {
    if (available.has(key)) return key;
  }

  return 'index';
}

/** Resolve template key and verify it exists on a loaded theme. */
export function resolvePageTemplate(input: TemplateResolutionInput, loaded: LoadedTheme): string {
  const key = resolvePageTemplateKey(input);
  if (loaded.templates[key]) return key;
  if (loaded.templates.index) return 'index';
  const first = Object.keys(loaded.templates)[0];
  return first ?? 'index';
}

export { CONTENT_TYPE_DEFAULTS };
