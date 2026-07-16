import type { CmsBlock, CmsPage } from '../types';

/**
 * `page()`/`blocks()` bridge — maps the CMS's real `Page` doc + block-array
 * shape (`src/models/Page.ts`, `component: Mixed[]`) into the engine's opaque
 * `CmsPage`/`CmsBlock` contracts. Pure, synchronous, no I/O — the caller
 * (`buildRenderInput`) already has the data fetched.
 */

interface PageMetadata {
  _id?: unknown;
  id?: string;
  slug?: string;
  pageName?: string;
  isHome?: boolean;
  [key: string]: unknown;
}

export function toCmsPage(metadata: PageMetadata, resolvedSlug: string): CmsPage {
  return {
    id: String(metadata._id ?? metadata.id ?? resolvedSlug),
    slug: resolvedSlug,
    title: metadata.pageName || resolvedSlug,
    type: metadata.isHome ? 'home' : 'page',
  };
}

export function toCmsBlocks(rawBlocks: unknown[]): CmsBlock[] {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks.map((raw, index) => {
    const block = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      id: String(block.uniqueId ?? block.id ?? `block-${index}`),
      type: String(block.type ?? 'unknown'),
      data: block,
    };
  });
}
