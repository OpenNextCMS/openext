import type { BlockData } from '@/types/index';
import type { HeaderId } from '../types';
import { makeBlock } from '../blockUtils';

export interface HeaderFooterContext {
  businessName: string;
  navLinks: { label: string; href: string }[];
  /** Business address collected in the setup wizard; rendered by footers that show an address. */
  location?: string;
}

/**
 * Header template registry. Every header is a single `nav-bar` block (the real
 * CMS navbar — see src/components/editor/blocks/NavbarBlock.tsx) configured with
 * a text logo, the site's nav links, and a layout that distinguishes the style.
 * `layout` ∈ horizontal | vertical | hamburger | two-line (sidebar = vertical).
 */
export const HEADER_TEMPLATES: Record<HeaderId, (ctx: HeaderFooterContext) => BlockData[]> = {
  classic: ({ businessName, navLinks }) => [
    makeBlock('nav-bar', {
      logo: businessName,
      logoType: 'text',
      layout: 'horizontal',
      links: navLinks,
    }),
  ],

  centered: ({ businessName, navLinks }) => [
    makeBlock('nav-bar', {
      logo: businessName,
      logoType: 'text',
      layout: 'two-line',
      links: navLinks,
    }),
  ],

  'modern-saas': ({ businessName, navLinks }) => [
    makeBlock('nav-bar', {
      logo: businessName,
      logoType: 'text',
      layout: 'horizontal',
      // Append a call-to-action link, the hallmark of a SaaS header.
      links: [...navLinks, { label: 'Get Started', href: '/contact' }],
    }),
  ],

  'mega-menu': ({ businessName, navLinks }) => {
    const home = navLinks.find((l) => l.label.toLowerCase() === 'home');
    const contact = navLinks.find((l) => l.label.toLowerCase() === 'contact');
    const middle = navLinks.filter(
      (l) => l.label.toLowerCase() !== 'home' && l.label.toLowerCase() !== 'contact'
    );
    return [
      makeBlock('nav-bar', {
        logo: businessName,
        logoType: 'text',
        layout: 'horizontal',
        links: [
          ...(home ? [home] : []),
          { label: 'Explore', href: '#', children: middle },
          ...(contact ? [contact] : []),
        ],
      }),
    ];
  },

  sidebar: ({ businessName, navLinks }) => [
    makeBlock('nav-bar', {
      logo: businessName,
      logoType: 'text',
      layout: 'vertical',
      links: navLinks,
    }),
  ],
};

export function getHeaderTemplate(id: HeaderId | string): (ctx: HeaderFooterContext) => BlockData[] {
  return HEADER_TEMPLATES[id as HeaderId] ?? HEADER_TEMPLATES.classic;
}
