import type { Metadata } from 'next';
import { getSiteUrl } from './url';
import type { SeoBlog } from './types';

/**
 * Build Next.js `Metadata` for a blog post from its `seo` object (with sensible
 * fallbacks to the post's own fields). Used by the public post page's
 * `generateMetadata()`.
 */
export function buildBlogMetadata(post: SeoBlog): Metadata {
  const siteUrl = getSiteUrl();
  const seo = post.seo || {};
  const title = seo.title || post.pageName;
  const description = seo.description || post.excerpt || '';
  const canonical = seo.canonical || `${siteUrl}/${post.slug}`;
  const ogImage = seo.ogImage || post.featuredImage;
  const allowIndex = seo.index !== false;

  return {
    title,
    description,
    keywords: seo.keywords,
    alternates: { canonical },
    robots: allowIndex
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
