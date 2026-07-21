import type { VariantFamily } from '@/types/component-variants';

/**
 * Maps a page-canvas block `type` onto a theme variant family.
 *
 * When the active theme picks a variant for that family (e.g. hero → "split"),
 * `RenderBlock` swaps the concrete section component while keeping the block's
 * content JSON. Blocks that are not in a family keep their fixed type mapping.
 *
 * Families without a matching page block type (pricing / cta / footer today)
 * are only used by the Theme Builder preview canvas.
 */
const BLOCK_TYPE_TO_FAMILY: Record<string, VariantFamily> = {
  // Navbar
  'nav-bar': 'navbar',

  // Hero family
  hero: 'hero',
  'hero-main': 'hero',
  'hero-centered': 'hero',
  'hero-split': 'hero',

  // Features family
  'feature-trio': 'features',
  'feature-vertical': 'features',
  'feature-horizontal': 'features',
  'feature-boxed': 'features',
  'feature-zigzag': 'features',
  'feature-side-image': 'features',
  'feature-checklist': 'features',
  'feature-list': 'features',
  'feature-bento': 'features',
  'content-features': 'features',

  // Testimonials family
  'testimonial-main': 'testimonials',
  'testimonial-single': 'testimonials',
  'testimonial-single-large': 'testimonials',

  // Pricing / CTA (theme preview + apply-layout)
  pricing: 'pricing',
  'pricing-table': 'pricing',
  cta: 'cta',
  'cta-section': 'cta',
};

/** Resolve the variant family for a canvas block type, or `null` if none. */
export function getVariantFamilyForBlockType(blockType: string): VariantFamily | null {
  return BLOCK_TYPE_TO_FAMILY[blockType] ?? null;
}

/** True when this block type participates in theme-driven layout swapping. */
export function isThemeVariantBlock(blockType: string): boolean {
  return blockType in BLOCK_TYPE_TO_FAMILY;
}
