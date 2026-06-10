/**
 * Block factory: turns a block TYPE + the personalized content bundle + an image
 * set into a fully populated, editable CMS block (BlockData). Each mapper emits
 * exactly the `content` fields the corresponding component parses — verified
 * against the component source (e.g. HeroMain, FeatureTrio, StatisticsBoxed,
 * TestimonialMain, ContactSimple, EcommerceGrid).
 *
 * No new block types and no inline theming — generated blocks inherit the active
 * theme via CSS variables, exactly like blocks added by hand.
 */
import type { BlockData } from '@/types/index';
import { makeBlock } from '@/templates/blockUtils';
import type { PersonalizedContent } from './content-personalizer';
import type { ImageSet } from '@/lib/image-library';
import { pickImage } from '@/lib/image-library';

export interface BlockBuildContext {
  content: PersonalizedContent;
  images: ImageSet;
  businessName: string;
  location?: string;
  /** Position of the block on the page — drives deterministic image picking. */
  index: number;
}

function emailFor(businessName: string): string {
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `hello@${slug || 'business'}.com`;
}

/** Build one block for the given type. Returns null for unknown types. */
export function buildBlock(type: string, ctx: BlockBuildContext): BlockData | null {
  const { content: c, images, businessName, location, index } = ctx;
  const loc = location?.trim();

  switch (type) {
    /* ----------------------------- Hero ----------------------------- */
    case 'hero-main':
    case 'hero-centered':
      return makeBlock(type, {
        title: c.heroTitle,
        description: c.heroSubtitle,
        primaryButtonText: c.heroCTA,
        secondaryButtonText: c.heroSecondaryCTA,
        image: pickImage(images.hero, index),
      });

    /* --------------------------- Features --------------------------- */
    case 'feature-trio':
    case 'content-features':
      return makeBlock(type, {
        mainTitle: c.sectionTitle,
        features: c.features.slice(0, 3),
      });

    case 'feature-boxed':
    case 'feature-horizontal':
    case 'feature-vertical':
      return makeBlock(type, {
        eyebrow: 'Features',
        mainTitle: c.sectionTitle,
        features: c.features.slice(0, 6),
      });

    case 'feature-side-image':
      return makeBlock(type, {
        image: pickImage(images.feature, index),
        features: c.features.slice(0, 3),
      });

    case 'feature-checklist':
      return makeBlock(type, {
        mainTitle: c.sectionTitle,
        mainDescription: c.aboutContent,
        buttonText: c.heroCTA,
        items: c.features.map((f) => f.title),
      });

    /* -------------------------- Statistics -------------------------- */
    case 'statistics-main':
      return makeBlock(type, {
        stats: c.statistics.map((s) => ({ value: s.value, label: s.label })),
      });

    case 'statistics-boxed':
      return makeBlock(type, {
        mainTitle: c.sectionTitle,
        mainDescription: c.aboutContent,
        stats: c.statistics,
      });

    case 'statistics-side-image':
      return makeBlock(type, {
        title: c.sectionTitle,
        description: c.aboutContent,
        image: pickImage(images.feature, index),
        stats: c.statistics,
      });

    /* ------------------------- Testimonials ------------------------- */
    case 'testimonial-main':
      return makeBlock(type, {
        mainTitle: 'What Our Clients Say',
        testimonials: c.testimonials.map((t) => ({ ...t, image: '' })),
      });

    case 'testimonial-single':
    case 'testimonial-single-large': {
      const t = c.testimonials[0];
      return makeBlock(type, { text: t.text, name: t.name, role: t.role });
    }

    /* --------------------------- Content ---------------------------- */
    case 'content-split': {
      const a = c.galleryItems[0];
      const b = c.galleryItems[1] ?? c.galleryItems[0];
      return makeBlock(type, {
        left: {
          image: pickImage(images.gallery, index),
          title: a.title,
          description: a.description,
          buttonText: 'Learn More',
        },
        right: {
          image: pickImage(images.gallery, index + 1),
          title: b.title,
          description: b.description,
          buttonText: 'Learn More',
        },
      });
    }

    case 'content-detail':
      return makeBlock(type, {
        heroImage: pickImage(images.gallery, index),
        authorName: businessName,
        authorBio: c.aboutTitle,
        mainText: c.aboutContent,
      });

    case 'content-gallery':
      return makeBlock(type, {
        mainTitle: c.galleryTitle,
        mainDescription: c.aboutContent,
        items: c.galleryItems.map((g, i) => ({
          image: pickImage(images.gallery, i),
          subtitle: g.subtitle,
          title: g.title,
          description: g.description,
        })),
      });

    case 'content-trio':
      return makeBlock(type, {
        mainTitle: c.galleryTitle,
        mainDescription: c.aboutContent,
        items: c.galleryItems.slice(0, 3).map((g, i) => ({
          image: pickImage(images.gallery, i),
          title: g.title,
          description: g.description,
        })),
      });

    case 'content-categories':
      return makeBlock(type, {
        title: c.sectionTitle,
        description: c.aboutContent,
        linkText: 'Learn More',
        categoryHeading: 'Categories',
        links: c.categories,
      });

    /* --------------------------- Ecommerce -------------------------- */
    case 'ecommerce-grid':
      return makeBlock(type, {
        products: c.products.map((p, i) => ({
          image: pickImage(images.product, i),
          category: p.category,
          title: p.title,
          price: p.price,
        })),
      });

    case 'ecommerce-info': {
      const p = c.products[0];
      return makeBlock(type, {
        image: pickImage(images.product, index),
        brand: businessName,
        title: p.title,
        price: p.price,
        description: c.heroSubtitle,
        buttonText: 'Add to Cart',
      });
    }

    /* ---------------------------- Contact --------------------------- */
    case 'contact':
    case 'contact-simple':
      return makeBlock(type, {
        title: c.contactHeading,
        description: c.contactDescription,
        buttonText: c.contactCTA,
        email: emailFor(businessName),
        address: loc || '123 Business Ave',
        city: loc || '',
      });

    /* ----------------------------- Blog ----------------------------- */
    case 'blog-feed':
      return makeBlock(type, {
        layout: 'grid',
        postsPerPage: 6,
        cardsPerRow: 3,
        showAuthor: true,
        showDate: true,
        showCategory: true,
        showExcerpt: true,
      });

    default:
      // Unknown/unsupported type — skip rather than emit a broken block.
      return null;
  }
}

/** Build an ordered list of blocks from a list of block types. */
export function buildBlocks(
  types: string[],
  base: Omit<BlockBuildContext, 'index'>
): BlockData[] {
  return types
    .map((type, index) => buildBlock(type, { ...base, index }))
    .filter((b): b is BlockData => b !== null);
}
