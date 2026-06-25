import type { WebsiteType } from '../types';

/**
 * Supporting-page registry. `DEFAULT_PAGES` lists the page names per website
 * type (matching the feature brief); `PAGE_BLOCKS` maps each page name to an
 * ordered list of existing CMS block types. "Home" is generated separately as
 * the homepage and is intentionally excluded from the supporting set.
 *
 * Supporting pages are deliberately short (2–4 blocks): they are editable
 * starting points, not bespoke layouts.
 */
export const DEFAULT_PAGES: Record<WebsiteType, string[]> = {
  agency: ['Home', 'About', 'Services', 'Portfolio', 'Contact'],
  saas: ['Home', 'Features', 'Pricing', 'Blog', 'Contact'],
  ecommerce: ['Home', 'Shop', 'Collections', 'About', 'Contact'],
  portfolio: ['Home', 'Projects', 'About', 'Resume', 'Contact'],
  corporate: ['Home', 'About', 'Services', 'Case Studies', 'Contact'],
  restaurant: ['Home', 'Menu', 'Gallery', 'About', 'Contact'],
  'real-estate': ['Home', 'Listings', 'Agents', 'About', 'Contact'],
  'personal-brand': ['Home', 'About', 'Work', 'Contact'],
  healthcare: ['Home', 'Services', 'About', 'Contact'],
  education: ['Home', 'Courses', 'About', 'Contact'],
};

/** Page name -> ordered block types. Every type is a real CMS block. */
export const PAGE_BLOCKS: Record<string, string[]> = {
  About: ['hero-centered', 'content-split', 'content-detail', 'statistics-boxed'],
  Services: ['hero-main', 'feature-trio', 'content-split', 'contact-simple'],
  Portfolio: ['hero-centered', 'content-gallery', 'testimonial-single'],
  Projects: ['hero-centered', 'content-gallery', 'statistics-side-image'],
  Work: ['hero-centered', 'content-gallery', 'testimonial-single'],
  Gallery: ['hero-centered', 'content-gallery', 'feature-trio'],
  Contact: ['hero-centered', 'contact'],
  Features: ['hero-main', 'feature-horizontal', 'statistics-main', 'contact-simple'],
  Pricing: ['hero-centered', 'feature-boxed', 'contact-simple'],
  Blog: ['hero-centered', 'blog-feed'],
  Shop: ['hero-main', 'content-categories', 'ecommerce-grid'],
  Collections: ['hero-centered', 'content-gallery', 'ecommerce-grid'],
  'Case Studies': ['hero-centered', 'content-gallery', 'statistics-boxed', 'testimonial-main'],
  Menu: ['hero-centered', 'content-gallery', 'feature-trio'],
  Listings: ['hero-main', 'content-gallery', 'statistics-main'],
  Agents: ['hero-centered', 'content-trio', 'testimonial-main'],
  Resume: ['hero-centered', 'content-detail', 'statistics-side-image', 'feature-checklist'],
  Courses: ['hero-centered', 'content-trio', 'feature-horizontal', 'contact-simple'],
};

const FALLBACK_PAGE_BLOCKS = ['hero-centered', 'content-split', 'contact-simple'];

export function getPageBlocks(pageName: string): string[] {
  return PAGE_BLOCKS[pageName] ?? FALLBACK_PAGE_BLOCKS;
}

/**
 * Page names the wizard must never generate (and never link to). Keep lowercase.
 * "About" is intentionally omitted from generated starter sites.
 */
const OMITTED_PAGES = new Set(['about']);

/** Supporting pages (everything except "Home" and omitted pages) for a website type. */
export function getSupportingPages(type: WebsiteType | string): string[] {
  const all = DEFAULT_PAGES[type as WebsiteType] ?? DEFAULT_PAGES.agency;
  return all.filter(
    (name) => name.toLowerCase() !== 'home' && !OMITTED_PAGES.has(name.toLowerCase())
  );
}

/** Build the nav links (label + slug) used by header/footer templates. */
export function getNavLinks(type: WebsiteType | string): { label: string; href: string }[] {
  const all = DEFAULT_PAGES[type as WebsiteType] ?? DEFAULT_PAGES.agency;
  return all
    .filter((name) => !OMITTED_PAGES.has(name.toLowerCase()))
    .map((name) => ({
      label: name,
      href: name.toLowerCase() === 'home' ? '/home' : `/${slugify(name)}`,
    }));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
