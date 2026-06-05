'use client';

import { useMemo } from 'react';
import type { Block } from '@/types/index';
import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants, VariantFamily } from '@/types/component-variants';
import { themeConfigToCssVars } from '@/lib/theme/cssVars.site';
import { getVariantComponent } from '@/lib/theme/component-registry';

/**
 * Renders a representative mini-site (navbar → hero → features → pricing →
 * testimonials → CTA → footer) using the selected component variants, wrapped in
 * the theme's CSS variables. Purely presentational and `isEditing={false}`, so
 * it reflects the live draft tokens with no page refresh.
 */

// The order of families shown in the preview.
const PREVIEW_ORDER: VariantFamily[] = [
  'navbar',
  'hero',
  'features',
  'pricing',
  'testimonials',
  'cta',
  'footer',
];

// A benign synthetic block per family (components ignore `type`; they read
// `content` JSON and fall back to demo content when empty).
//
// NavbarBlock is the exception: it only falls back to demo links when `links`
// is undefined, so the preview navbar must carry explicit demo content or it
// renders a bare, link-less header.
const PREVIEW_NAVBAR_CONTENT = JSON.stringify({
  logo: 'Brand',
  logoType: 'text',
  logoSource: 'custom',
  layout: 'horizontal',
  links: [
    { label: 'Home', href: '#' },
    { label: 'Features', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Contact', href: '#' },
  ],
});

const SAMPLE_BLOCK: Record<VariantFamily, Block> = {
  navbar: { type: 'nav-bar', uniqueId: 'preview-navbar', content: PREVIEW_NAVBAR_CONTENT },
  hero: { type: 'hero-main', uniqueId: 'preview-hero' },
  features: { type: 'feature-trio', uniqueId: 'preview-features' },
  pricing: { type: 'card', uniqueId: 'preview-pricing' },
  testimonials: { type: 'testimonial-main', uniqueId: 'preview-testimonials' },
  cta: { type: 'card', uniqueId: 'preview-cta' },
  footer: { type: 'card', uniqueId: 'preview-footer' },
};

export function PreviewCanvas({
  config,
  componentVariants,
}: {
  config: ThemeConfig;
  componentVariants: ComponentVariants;
}) {
  const vars = useMemo(() => themeConfigToCssVars(config), [config]);

  return (
    <div className="site-theme-scope" style={vars}>
      {PREVIEW_ORDER.map((family) => {
        const Component = getVariantComponent(family, componentVariants[family]);
        return (
          <div key={family} data-preview-family={family}>
            <Component block={SAMPLE_BLOCK[family]} isEditing={false} />
          </div>
        );
      })}
    </div>
  );
}

export default PreviewCanvas;
