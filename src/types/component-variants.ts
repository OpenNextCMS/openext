/**
 * Component variant system.
 *
 * Variants are visual presets for a *family* of public section components
 * (navbar, hero, features, ...). They are selected in the Theme Builder and
 * stored on the theme. Variants are NOT new draggable block types — the
 * variant registry (`src/lib/theme/component-registry.ts`) maps a
 * (family, variantId) pair onto an existing `src/components/ui/*` component.
 */

export type VariantFamily =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'cta'
  | 'pricing'
  | 'testimonials'
  | 'footer';

/** The chosen variant id for each family. All fields optional (fall back to default). */
export type ComponentVariants = Partial<Record<VariantFamily, string>>;

/** A single selectable variant within a family. */
export interface VariantDefinition {
  id: string;
  family: VariantFamily;
  label: string;
  /** Optional thumbnail/preview asset path. */
  preview?: string;
  /** True for the family's fallback variant. */
  isDefault?: boolean;
}

/** Metadata for a family, used to render the Variants tab. */
export interface VariantFamilyMeta {
  family: VariantFamily;
  label: string;
  variants: VariantDefinition[];
}

export const VARIANT_FAMILIES: VariantFamily[] = [
  'navbar',
  'hero',
  'features',
  'cta',
  'pricing',
  'testimonials',
  'footer',
];
