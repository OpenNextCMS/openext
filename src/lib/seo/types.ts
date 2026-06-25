import type { BlogSeo } from '@/types/index';

/** A populated-or-plain author reference. */
export interface SeoAuthor {
  name?: string;
  avatar?: string;
}

/** The subset of a blog post needed by the SEO helpers. */
export interface SeoBlog {
  pageName: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  seo?: BlogSeo;
  authorName?: string;
  authorId?: SeoAuthor | string | null;
  categories?: { name?: string; slug?: string }[] | string[];
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export function authorName(post: SeoBlog): string | undefined {
  if (post.authorId && typeof post.authorId === 'object') return post.authorId.name;
  return post.authorName || undefined;
}
