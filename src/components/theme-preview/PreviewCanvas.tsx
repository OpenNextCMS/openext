'use client';

import { useMemo } from 'react';
import type { Block } from '@/types/index';
import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants, VariantFamily } from '@/types/component-variants';
import { themeConfigToCssVars } from '@/lib/theme/cssVars.site';
import { getVariantComponent } from '@/lib/theme/component-registry';

/**
 * Renders a representative mini-site using the selected component variants,
 * wrapped in the theme's CSS variables. When `layoutSections` is provided
 * (from theme.layouts.default.sections), that order is used so the preview
 * matches what “Apply page layout” writes to the homepage.
 */

const DEFAULT_PREVIEW_ORDER: VariantFamily[] = [
  'navbar',
  'hero',
  'features',
  'pricing',
  'testimonials',
  'cta',
  'footer',
];

const FAMILY_SET = new Set<string>(DEFAULT_PREVIEW_ORDER);

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
  pricing: { type: 'pricing-table', uniqueId: 'preview-pricing' },
  testimonials: { type: 'testimonial-main', uniqueId: 'preview-testimonials' },
  cta: { type: 'cta-section', uniqueId: 'preview-cta' },
  footer: { type: 'footer-section', uniqueId: 'preview-footer' },
};

function resolvePreviewOrder(layoutSections?: string[]): VariantFamily[] {
  if (!layoutSections?.length) return DEFAULT_PREVIEW_ORDER;
  const fromLayout = layoutSections
    .map((s) => s.toLowerCase())
    .filter((s): s is VariantFamily => FAMILY_SET.has(s));
  if (!fromLayout.length) return DEFAULT_PREVIEW_ORDER;

  const body = fromLayout.filter((s) => s !== 'navbar' && s !== 'footer');
  const hasNav = fromLayout.includes('navbar');
  const hasFooter = fromLayout.includes('footer');
  return [
    ...(hasNav ? (['navbar'] as const) : (['navbar'] as const)),
    ...body,
    ...(hasFooter ? (['footer'] as const) : (['footer'] as const)),
  ];
}

export function PreviewCanvas({
  config,
  componentVariants,
  layoutSections,
}: {
  config: ThemeConfig;
  componentVariants: ComponentVariants;
  /** Optional sections from theme.layouts.default.sections */
  layoutSections?: string[];
}) {
  const vars = useMemo(() => themeConfigToCssVars(config), [config]);
  const order = useMemo(() => resolvePreviewOrder(layoutSections), [layoutSections]);

  return (
    <div className="site-theme-scope" style={vars}>
      {order.map((family, index) => {
        const Component = getVariantComponent(family, componentVariants[family]);
        return (
          <div key={`${family}-${index}`} data-preview-family={family}>
            <Component block={SAMPLE_BLOCK[family]} isEditing={false} />
          </div>
        );
      })}
    </div>
  );
}

export default PreviewCanvas;
