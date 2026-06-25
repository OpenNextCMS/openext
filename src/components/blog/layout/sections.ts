import { v4 as uuidv4 } from 'uuid';
import type { SectionType, LayoutSection } from '@/types/index';

export const SECTION_META: Record<SectionType, { label: string; description: string }> = {
  hero: { label: 'Hero', description: 'Large header with heading + image' },
  'featured-post': { label: 'Featured Post', description: 'Highlight a single post' },
  'latest-posts': { label: 'Latest Posts', description: 'Grid of recent posts' },
  categories: { label: 'Categories', description: 'Browse-by-category links' },
  sidebar: { label: 'Sidebar', description: 'Recent posts + categories' },
  newsletter: { label: 'Newsletter', description: 'Email signup band' },
  cta: { label: 'CTA', description: 'Call-to-action band' },
  author: { label: 'Author', description: 'Author profile card' },
  'footer-cta': { label: 'Footer CTA', description: 'Closing call-to-action' },
};

export const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[];

export const DEFAULT_SECTION_SETTINGS: Record<SectionType, () => Record<string, unknown>> = {
  hero: () => ({ heading: 'Our Blog', subheading: 'Insights, guides and stories', image: '' }),
  'featured-post': () => ({ title: 'Featured', postId: '' }),
  'latest-posts': () => ({ title: 'Latest posts', count: 6, columns: 3 }),
  categories: () => ({ title: 'Browse by category' }),
  sidebar: () => ({ showRecent: true, showCategories: true, position: 'right' }),
  newsletter: () => ({ heading: 'Subscribe to our newsletter', buttonLabel: 'Subscribe' }),
  cta: () => ({ heading: 'Ready to get started?', buttonLabel: 'Get started', href: '#' }),
  author: () => ({ authorId: '' }),
  'footer-cta': () => ({ heading: 'Stay in touch', buttonLabel: 'Contact us', href: '#' }),
};

export function createSection(type: SectionType): LayoutSection {
  return {
    id: uuidv4(),
    type,
    visible: true,
    settings: DEFAULT_SECTION_SETTINGS[type](),
    responsive: { desktop: {}, tablet: {}, mobile: {} },
  };
}

/** Tailwind responsive visibility classes from a section's per-breakpoint `hidden` flags. */
export function visibilityClasses(section: LayoutSection): string {
  const mobile = section.responsive?.mobile?.hidden ? 'hidden' : 'block';
  const tablet = section.responsive?.tablet?.hidden ? 'md:hidden' : 'md:block';
  const desktop = section.responsive?.desktop?.hidden ? 'lg:hidden' : 'lg:block';
  return `${mobile} ${tablet} ${desktop}`;
}
