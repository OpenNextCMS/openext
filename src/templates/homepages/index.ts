import type { WebsiteType } from '../types';

/**
 * Homepage layout registry: an ordered list of existing CMS block types per
 * website type. The generator walks this list and asks the block factory to
 * populate each entry with personalized content + imagery. Every type here is a
 * real block in src/components/editor/renderblock.tsx — no AI, no new blocks.
 *
 * The 7 explicitly-specified types match the feature brief verbatim; the 3
 * remaining wizard types (personal-brand, healthcare, education) get sensible
 * sets composed from the same verified block vocabulary.
 */
export const HOMEPAGE_TEMPLATES: Record<WebsiteType, string[]> = {
  agency: [
    'hero-main',
    'feature-trio',
    'content-split',
    'statistics-boxed',
    'testimonial-main',
    'contact-simple',
  ],
  saas: [
    'hero-centered',
    'feature-horizontal',
    'content-detail',
    'statistics-main',
    'testimonial-single-large',
    'contact-simple',
  ],
  ecommerce: [
    'hero-main',
    'content-categories',
    'ecommerce-grid',
    'feature-boxed',
    'testimonial-single',
    'ecommerce-info',
  ],
  portfolio: [
    'hero-centered',
    'content-split',
    'content-gallery',
    'statistics-side-image',
    'testimonial-single',
    'contact',
  ],
  corporate: [
    'hero-main',
    'content-trio',
    'feature-side-image',
    'statistics-boxed',
    'testimonial-single-large',
    'contact-simple',
  ],
  restaurant: [
    'hero-main',
    'content-gallery',
    'feature-trio',
    'content-detail',
    'testimonial-main',
    'contact',
  ],
  'real-estate': [
    'hero-main',
    'statistics-main',
    'content-gallery',
    'feature-boxed',
    'testimonial-main',
    'contact',
  ],
  // Wizard types without a brief-specified set — sensible, on-brand defaults.
  'personal-brand': [
    'hero-centered',
    'content-split',
    'feature-trio',
    'statistics-side-image',
    'testimonial-single-large',
    'contact-simple',
  ],
  healthcare: [
    'hero-main',
    'feature-trio',
    'content-detail',
    'statistics-boxed',
    'testimonial-main',
    'contact-simple',
  ],
  education: [
    'hero-centered',
    'content-trio',
    'feature-horizontal',
    'statistics-main',
    'testimonial-single',
    'contact',
  ],
};

/** Safe lookup with an agency fallback for unknown/empty types. */
export function getHomepageTemplate(type: WebsiteType | string): string[] {
  return HOMEPAGE_TEMPLATES[type as WebsiteType] ?? HOMEPAGE_TEMPLATES.agency;
}
