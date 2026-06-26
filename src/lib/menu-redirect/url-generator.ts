import type { MenuRedirectMapping, MenuRedirectTargetType } from '@/types/menu-redirect';

/**
 * Optional lookups for resolving slugs/collection paths from ids when a mapping
 * doesn't carry a stored slug.
 */
export interface UrlLookups {
  resolveSlug?: (targetType: MenuRedirectTargetType, targetId: string) => string | undefined;
  cmsCollectionSlug?: (targetId: string) => string | undefined;
}

function appendParams(url: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return url;
  // Don't append a query string to a bare anchor.
  if (url.startsWith('#')) return url;
  const qs = new URLSearchParams(params).toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

/**
 * Pure URL builder for a mapping. Examples:
 *   page          {slug:'about'}                 -> '/about'
 *   blog          {slug:'my-post'}               -> '/blog/my-post'
 *   blog-category {targetId:'64..'}              -> '/blog?category=64..'
 *   cms           {collection:'docs',item:'x'}   -> '/docs/x'
 *   anchor        {targetUrl:'#features'}         -> '#features'
 *   external      {targetUrl:'https://x.com'}     -> 'https://x.com'
 *   + dynamicParams {utm:'nav'}                   -> '...?utm=nav'
 * Missing slugs degrade gracefully to a sensible base path.
 */
export function generateTargetUrl(
  mapping: Pick<
    MenuRedirectMapping,
    'targetType' | 'targetId' | 'targetSlug' | 'targetUrl' | 'dynamicParams'
  >,
  lookups: UrlLookups = {}
): string {
  let slug =
    mapping.targetSlug ||
    (mapping.targetId ? lookups.resolveSlug?.(mapping.targetType, mapping.targetId) : undefined) ||
    '';
  // Guard against pages with a missing/garbage slug producing "/undefined".
  if (slug === 'undefined' || slug === 'null') slug = '';

  let url: string;
  switch (mapping.targetType) {
    case 'page':
      url = slug ? `/${slug}` : '/';
      break;
    case 'blog':
      url = slug ? `/blog/${slug}` : '/blog';
      break;
    case 'blog-category':
      // The repo's blog listing filters by category id via /blog?category=.
      url = mapping.targetId
        ? `/blog?category=${mapping.targetId}`
        : slug
          ? `/blog?category=${slug}`
          : '/blog';
      break;
    case 'cms': {
      const collectionSlug = mapping.targetId
        ? lookups.cmsCollectionSlug?.(mapping.targetId)
        : undefined;
      url = collectionSlug && slug ? `/${collectionSlug}/${slug}` : slug ? `/${slug}` : '/';
      break;
    }
    case 'anchor':
      url = (mapping.targetUrl || '').startsWith('#')
        ? (mapping.targetUrl as string)
        : `#${(mapping.targetUrl || '').replace(/^#/, '')}`;
      break;
    case 'external':
      url = mapping.targetUrl || '#';
      break;
    default:
      url = '#';
  }

  return appendParams(url, mapping.dynamicParams);
}
