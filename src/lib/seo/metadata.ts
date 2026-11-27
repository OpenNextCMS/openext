import type { Metadata } from 'next';
import { getSiteUrl } from './url';
import type { SeoBlog, SeoPage } from './types';
import { DEFAULT_SITE_LOCALE, withLocalePrefix } from '@/lib/i18n/siteLanguages';

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
    metadataBase: new URL(siteUrl),
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

/**
 * Build Next.js `Metadata` for a CMS page from `seoName` / `seoMeta` (with
 * fallbacks to `pageName` / `description`). Used by `/` and `/[slug]`.
 */
export function buildPageMetadata(
  page: SeoPage,
  opts: { isHome?: boolean; locale?: string; defaultLocale?: string } = {}
): Metadata {
  const siteUrl = getSiteUrl();
  const title =
    (page.seoName || '').trim() ||
    (page.pageName || '').trim() ||
    (opts.isHome ? 'Home' : 'Page');
  const description =
    (page.seoMeta || '').trim() || (page.description || '').trim() || '';
  const isHome = opts.isHome === true || page.isHome === true;
  const slug = (page.slug || '').replace(/^\//, '');
  const path = isHome || !slug ? '/' : `/${slug}`;
  const defaultLocale = opts.defaultLocale || DEFAULT_SITE_LOCALE;
  const locale = opts.locale || defaultLocale;
  const prefixed = withLocalePrefix(path, locale, defaultLocale);
  const canonical = `${siteUrl}${prefixed === '/' ? '' : prefixed}` || siteUrl;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
