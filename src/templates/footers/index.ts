import type { BlockData } from '@/types/index';
import type { FooterId } from '../types';
import { makeBlock } from '../blockUtils';
import type { HeaderFooterContext } from '../headers';

/**
 * Footer template registry. Footers are composed from existing generic blocks
 * (`content-categories` for a single link group, `feature-list` for multi-column
 * link groups) so they render and stay editable with no special footer block.
 * Link items accept the `{ text, url }` shape these components normalize to.
 */
const toLinkItems = (links: { label: string; href: string }[]) =>
  links.map((l) => ({ text: l.label, url: l.href }));

export const FOOTER_TEMPLATES: Record<FooterId, (ctx: HeaderFooterContext) => BlockData[]> = {
  simple: ({ businessName, navLinks }) => [
    makeBlock('content-categories', {
      title: businessName,
      description: `© ${businessName}. All rights reserved.`,
      categoryHeading: 'Quick Links',
      links: toLinkItems(navLinks),
    }),
  ],

  corporate: ({ businessName, navLinks, location }) => {
    const address = (location || '').trim();
    return [
      makeBlock('feature-list', {
        mainTitle: businessName,
        mainDescription: 'Building lasting value for our clients and partners.',
        buttonText: 'Contact Us',
        categories: [
          { title: 'Company', links: ['About', 'Careers', 'News', 'Contact'] },
          { title: 'Services', links: navLinks.map((l) => l.label) },
          { title: 'Resources', links: ['Blog', 'Guides', 'Support', 'FAQ'] },
          { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
          // Only render the address column when a location was provided.
          ...(address ? [{ title: 'Visit Us', links: [address] }] : []),
        ],
      }),
    ];
  },

  newsletter: ({ businessName, navLinks }) => [
    makeBlock('content-categories', {
      title: 'Join our newsletter',
      description: `Get the latest from ${businessName} — product news, tips and updates, straight to your inbox.`,
      linkText: 'Subscribe',
      categoryHeading: 'Explore',
      links: toLinkItems(navLinks),
    }),
  ],

  ecommerce: ({ businessName }) => [
    makeBlock('feature-list', {
      mainTitle: businessName,
      mainDescription: 'Shop with confidence — fast shipping and easy returns.',
      buttonText: 'Shop Now',
      categories: [
        { title: 'Shop', links: ['New Arrivals', 'Best Sellers', 'Collections', 'Sale'] },
        { title: 'Support', links: ['Shipping', 'Returns', 'Order Status', 'Contact'] },
        { title: 'Company', links: ['About', 'Stores', 'Careers'] },
        { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
      ],
    }),
  ],
};

export function getFooterTemplate(id: FooterId | string): (ctx: HeaderFooterContext) => BlockData[] {
  return FOOTER_TEMPLATES[id as FooterId] ?? FOOTER_TEMPLATES.simple;
}
