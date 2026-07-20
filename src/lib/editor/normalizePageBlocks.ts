import type { BlockData } from '@/redux/canvasSlice';
import { parseThemeSectionContent } from '@/modules/themeEngine/sectionSchema';

type EditorBlockType = BlockData['type'];

/** Map Theme Engine section ids → standard CMS block types for the block editor. */
const SECTION_ID_TO_BLOCK_TYPE: Record<string, EditorBlockType> = {
  hero: 'hero-main',
  navbar: 'nav-bar',
  footer: 'footer-section',
  features: 'feature-trio',
  pricing: 'pricing-table',
  testimonials: 'testimonial-main',
  cta: 'cta-section',
  gallery: 'content-gallery',
};

/** Map theme package block types (e.g. default-hero) → CMS block types. */
const THEME_BLOCK_TYPE_ALIASES: Record<string, EditorBlockType> = {
  'default-hero': 'hero-main',
};

function cmsTypeForThemeBlock(sectionId: string, blockType: string): EditorBlockType {
  return (
    SECTION_ID_TO_BLOCK_TYPE[sectionId] ||
    THEME_BLOCK_TYPE_ALIASES[blockType] ||
    'hero-main'
  );
}

/**
 * Prepare DB blocks for the classic block editor:
 * - drop theme-engine-frame (iframe wrapper)
 * - convert Theme Engine section blocks into normal CMS blocks
 */
export function normalizeBlocksForEditor(raw: unknown): BlockData[] {
  if (!Array.isArray(raw)) return [];

  const out: BlockData[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const block = item as BlockData & { type?: string; content?: unknown };

    if (block.type === 'theme-engine-frame') continue;

    const parsed = parseThemeSectionContent(block.content);
    if (parsed) {
      out.push({
        ...block,
        type: cmsTypeForThemeBlock(parsed.sectionId, block.type || ''),
        label: block.label || parsed.sectionId,
        content: JSON.stringify(parsed.data ?? {}),
      });
      continue;
    }

    out.push(block as BlockData);
  }

  return out;
}
