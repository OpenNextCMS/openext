import { getSiteUrl } from './url';
import { authorName, type SeoBlog } from './types';

/** Schema.org BlogPosting JSON-LD for a post. */
export function blogPostingJsonLd(post: SeoBlog): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${post.slug}`;
  const name = authorName(post);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seo?.title || post.pageName,
    description: post.seo?.description || post.excerpt || undefined,
    image: post.seo?.ogImage || post.featuredImage || undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: name ? { '@type': 'Person', name } : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
  };
}

/** Schema.org BreadcrumbList JSON-LD. */
export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
