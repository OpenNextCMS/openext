import type { BlockData } from '@/redux/canvasSlice';
import { isThemeEngineCanvas } from '@/modules/themeEngine/bridges/pageBridge';
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
 * Prepare DB blocks for the classic block editor.
 *
 * Theme Engine pages (leading `theme-engine-frame` block) are kept intact so the
 * canvas can iframe the exact theme via ThemeEngineFrameBlock. Section blocks
 * after the frame hold editable schema data — they must not be converted to
 * generic CMS block types.
 */
export function normalizeBlocksForEditor(raw: unknown): BlockData[] {
  if (!Array.isArray(raw)) return [];

  if (isThemeEngineCanvas(raw)) {
    return raw.filter((item) => item && typeof item === 'object').map((item) => item as BlockData);
  }

  const out: BlockData[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const block = item as BlockData & { type?: string; content?: unknown };

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

/** Blocks that should render on the editor/preview surface (excludes theme section data rows). */
export function visibleCanvasBlocks(blocks: BlockData[]): BlockData[] {
  if (!isThemeEngineCanvas(blocks)) return blocks;
  return blocks.filter((b) => b.type === 'theme-engine-frame');
}
