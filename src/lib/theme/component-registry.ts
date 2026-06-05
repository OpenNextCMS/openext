import type { BlockRendererProps } from '@/types/index';
import type { VariantFamily, VariantDefinition, VariantFamilyMeta } from '@/types/component-variants';

// Existing section components (reused as variants — NOT new block types).
import { NavbarBlock } from '@/components/editor/blocks/NavbarBlock';
import { HeroMain } from '@/components/ui/HeroMain';
import { HeroCentered } from '@/components/ui/HeroCentered';
import { FeatureTrio } from '@/components/ui/FeatureTrio';
import { FeatureVertical } from '@/components/ui/FeatureVertical';
import { FeatureHorizontal } from '@/components/ui/FeatureHorizontal';
import { FeatureBoxed } from '@/components/ui/FeatureBoxed';
import { FeatureZigzag } from '@/components/ui/FeatureZigzag';
import { TestimonialMain } from '@/components/ui/TestimonialMain';
import { TestimonialSingle } from '@/components/ui/TestimonialSingle';
import { TestimonialSingleLarge } from '@/components/ui/TestimonialSingleLarge';
// Token-driven sections created for the variant system.
import { PricingTable } from '@/components/ui/PricingTable';
import { CTASection } from '@/components/ui/CTASection';
import { FooterSection } from '@/components/ui/FooterSection';

type VariantComponent = React.ComponentType<BlockRendererProps>;

interface RegistryEntry {
  component: VariantComponent;
  label: string;
  isDefault?: boolean;
}

/**
 * The variant registry: maps `(family, variantId)` → an existing React
 * component. This is a registry/lookup (no switch statements scattered across
 * components). Variants are a theme property selected in the builder; they are
 * NOT draggable block types, so none of the block-type unions / palettes change.
 *
 * `navbar` currently maps all variants to NavbarBlock (the only navbar
 * component); the registry shape lets distinct navbar layouts be slotted in
 * later without touching consumers.
 */
const registry: Record<VariantFamily, Record<string, RegistryEntry>> = {
  navbar: {
    default: { component: NavbarBlock, label: 'Default', isDefault: true },
    centered: { component: NavbarBlock, label: 'Centered' },
    split: { component: NavbarBlock, label: 'Split' },
  },
  hero: {
    main: { component: HeroMain, label: 'Main', isDefault: true },
    centered: { component: HeroCentered, label: 'Centered' },
  },
  features: {
    trio: { component: FeatureTrio, label: 'Trio', isDefault: true },
    vertical: { component: FeatureVertical, label: 'Vertical' },
    horizontal: { component: FeatureHorizontal, label: 'Horizontal' },
    boxed: { component: FeatureBoxed, label: 'Boxed' },
    zigzag: { component: FeatureZigzag, label: 'Zigzag' },
  },
  cta: {
    default: { component: CTASection, label: 'Banner', isDefault: true },
  },
  pricing: {
    default: { component: PricingTable, label: 'Cards', isDefault: true },
  },
  testimonials: {
    main: { component: TestimonialMain, label: 'Grid', isDefault: true },
    single: { component: TestimonialSingle, label: 'Single' },
    'single-large': { component: TestimonialSingleLarge, label: 'Single (Large)' },
  },
  footer: {
    default: { component: FooterSection, label: 'Columns', isDefault: true },
  },
};

/** The default variant id for a family. */
export function getDefaultVariantId(family: VariantFamily): string {
  const entries = registry[family];
  const def = Object.entries(entries).find(([, e]) => e.isDefault);
  return def ? def[0] : Object.keys(entries)[0];
}

/**
 * Resolve a (family, variantId) to a component, falling back to the family's
 * default variant when the id is unknown.
 */
export function getVariantComponent(
  family: VariantFamily,
  variantId?: string
): VariantComponent {
  const entries = registry[family];
  const entry = (variantId && entries[variantId]) || entries[getDefaultVariantId(family)];
  return entry.component;
}

/** List the selectable variants for a family (for the Variants tab). */
export function listVariants(family: VariantFamily): VariantDefinition[] {
  return Object.entries(registry[family]).map(([id, e]) => ({
    id,
    family,
    label: e.label,
    isDefault: e.isDefault,
  }));
}

const FAMILY_LABELS: Record<VariantFamily, string> = {
  navbar: 'Navbar',
  hero: 'Hero',
  features: 'Feature Grid',
  cta: 'Call To Action',
  pricing: 'Pricing',
  testimonials: 'Testimonials',
  footer: 'Footer',
};

/** Metadata for every family + its variants (drives the Variants tab UI). */
export function listVariantFamilies(): VariantFamilyMeta[] {
  return (Object.keys(registry) as VariantFamily[]).map((family) => ({
    family,
    label: FAMILY_LABELS[family],
    variants: listVariants(family),
  }));
}
