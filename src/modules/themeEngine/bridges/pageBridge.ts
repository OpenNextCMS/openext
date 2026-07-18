import type { CmsBlock, CmsPage } from '../types';
import { parseThemeSectionContent } from '../sectionSchema';

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
  return rawBlocks
    .map((raw, index) => {
      const block = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      return {
        id: String(block.uniqueId ?? block.id ?? `block-${index}`),
        type: String(block.type ?? 'unknown'),
        data: block,
      };
    })
    // Editor-only frame for showing the live Theme Engine package on the canvas.
    // Never pass it into public theme.blocks() — that would nest an iframe inside the theme.
    .filter((block) => block.type !== 'theme-engine-frame');
}

/** True when the page component list is a Theme Engine exact-editable canvas. */
export function isThemeEngineCanvas(rawBlocks: unknown[]): boolean {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) return false;
  const first = rawBlocks[0] as { type?: string } | null;
  return first?.type === 'theme-engine-frame';
}

/** Extract theme-declared section blocks (excluding the frame). */
export function extractThemeSectionBlocks(rawBlocks: unknown[]): unknown[] {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks.filter((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const block = raw as Record<string, unknown>;
    if (block.type === 'theme-engine-frame') return false;
    return Boolean(parseThemeSectionContent(block.content));
  });
}
