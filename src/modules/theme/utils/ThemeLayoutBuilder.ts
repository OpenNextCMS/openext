import { randomUUID } from 'crypto';
import type { ComponentVariants, VariantFamily } from '@/types/component-variants';
import type { ITheme } from '@/types/theme';

/**
 * Build page-canvas blocks from a theme package layout + block presets +
 * componentVariants — so the live homepage can match the theme preview.
 */

export type ThemeLayoutSection =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'pricing'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'gallery';

/** Families that belong on a page body (not global header/footer chrome). */
const PAGE_BODY_SECTIONS = new Set<string>([
  'hero',
  'features',
  'pricing',
  'testimonials',
  'cta',
  'gallery',
]);

const CHROME_SECTIONS = new Set<string>(['navbar', 'footer']);

/** Default preview / apply order when layouts.default is missing. */
export const DEFAULT_THEME_LAYOUT_SECTIONS: ThemeLayoutSection[] = [
  'navbar',
  'hero',
  'features',
  'pricing',
  'testimonials',
  'cta',
  'footer',
];

/** Map theme section + variant id → concrete block type used on the canvas. */
const VARIANT_BLOCK_TYPE: Record<string, Record<string, string>> = {
  navbar: {
    default: 'nav-bar',
    centered: 'nav-bar',
    split: 'nav-bar',
  },
  hero: {
    main: 'hero-main',
    centered: 'hero-centered',
    split: 'hero-split',
  },
  features: {
    trio: 'feature-trio',
    vertical: 'feature-vertical',
    horizontal: 'feature-horizontal',
    boxed: 'feature-boxed',
    zigzag: 'feature-zigzag',
    bento: 'feature-bento',
  },
  testimonials: {
    main: 'testimonial-main',
    single: 'testimonial-single',
    'single-large': 'testimonial-single-large',
  },
  pricing: {
    default: 'pricing-table',
  },
  cta: {
    default: 'cta-section',
  },
  footer: {
    default: 'footer-section',
  },
  gallery: {
    default: 'content-gallery',
  },
};

export interface BuiltThemeBlock {
  type: string;
  uniqueId: string;
  content?: string;
}

function resolveBlockType(section: string, variants: ComponentVariants): string {
  const familyMap = VARIANT_BLOCK_TYPE[section];
  if (!familyMap) return section;
  const variantId =
    (variants[section as VariantFamily] as string | undefined) ||
    Object.keys(familyMap).find((k) => familyMap[k]) ||
    'default';
  return familyMap[variantId] || familyMap.default || Object.values(familyMap)[0];
}

function contentFromPreset(
  section: string,
  presets?: { blocks?: Record<string, unknown> }
): string | undefined {
  const blocks = presets?.blocks || {};
  const preset =
    blocks[section] ||
    blocks[`${section}-meridian`] ||
    Object.values(blocks).find((b) => {
      if (!b || typeof b !== 'object') return false;
      const id = String((b as { id?: string }).id || '').toLowerCase();
      const type = String((b as { type?: string }).type || '').toLowerCase();
      return id.includes(section) || type.includes(section);
    });

  if (!preset || typeof preset !== 'object') return undefined;
  const defaults = (preset as { defaults?: unknown }).defaults;
  if (defaults && typeof defaults === 'object') {
    return JSON.stringify(defaults);
  }
  if ((preset as { content?: unknown }).content != null) {
    const c = (preset as { content: unknown }).content;
    return typeof c === 'string' ? c : JSON.stringify(c);
  }
  return undefined;
}

export function getThemeLayoutSections(
  theme: Pick<ITheme, 'layouts'>,
  layoutKey = 'default'
): ThemeLayoutSection[] {
  const layout = theme.layouts?.[layoutKey] as { sections?: unknown } | undefined;
  if (layout && Array.isArray(layout.sections) && layout.sections.length > 0) {
    return layout.sections
      .map((s) => String(s).toLowerCase())
      .filter(Boolean) as ThemeLayoutSection[];
  }
  return [...DEFAULT_THEME_LAYOUT_SECTIONS];
}

export function buildPageBlocksFromTheme(
  theme: Pick<ITheme, 'layouts' | 'presets' | 'componentVariants'>,
  layoutKey = 'default'
): { body: BuiltThemeBlock[]; chrome: { navbar?: BuiltThemeBlock; footer?: BuiltThemeBlock } } {
  const sections = getThemeLayoutSections(theme, layoutKey);
  const variants = theme.componentVariants || {};
  const body: BuiltThemeBlock[] = [];
  const chrome: { navbar?: BuiltThemeBlock; footer?: BuiltThemeBlock } = {};

  for (const section of sections) {
    const type = resolveBlockType(section, variants);
    const content = contentFromPreset(section, theme.presets);
    const block: BuiltThemeBlock = {
      type,
      uniqueId: `theme-${section}-${randomUUID().slice(0, 8)}`,
      ...(content ? { content } : {}),
    };

    if (CHROME_SECTIONS.has(section)) {
      if (section === 'navbar') chrome.navbar = block;
      if (section === 'footer') chrome.footer = block;
      continue;
    }

    if (PAGE_BODY_SECTIONS.has(section) || !CHROME_SECTIONS.has(section)) {
      body.push(block);
    }
  }

  return { body, chrome };
}
