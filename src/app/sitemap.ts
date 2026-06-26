import type { MetadataRoute } from 'next';
import { getPageDbConnection, getPageModel, getBlogPostModel, getCategoryModel } from '@/utils/db';
import { getSiteUrl } from '@/lib/seo/url';

// Regenerate hourly.
export const revalidate = 3600;

/**
 * XML sitemap: the blog index, every published post, and category filter pages.
 * Scoped to this tenant's page DB.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const base: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/blogs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);
    const BlogPost = getBlogPostModel(pageDb);
    const Category = getCategoryModel(pageDb);

    const [pages, posts, categories] = await Promise.all([
      Page.find({ isPublished: true })
        .select('slug updatedAt')
        .lean()
        .exec(),
      BlogPost.find({ $or: [{ status: 'published' }, { isPublished: true }] })
        .select('slug updatedAt publishedAt')
        .lean()
        .exec(),
      Category.find({}).select('_id updatedAt').lean().exec(),
    ]);

    const pageEntries: MetadataRoute.Sitemap = pages.map((p) => ({
      url: `${siteUrl}/${(p as { slug?: string }).slug}`,
      lastModified: (p as { updatedAt?: Date }).updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${siteUrl}/blog/${(p as { slug?: string }).slug}`,
      lastModified:
        (p as { updatedAt?: Date }).updatedAt ||
        (p as { publishedAt?: Date }).publishedAt ||
        new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${siteUrl}/blogs?category=${(c as { _id: unknown })._id}`,
      lastModified: (c as { updatedAt?: Date }).updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

    return [...base, ...pageEntries, ...postEntries, ...categoryEntries];
  } catch (err) {
    console.error('Failed to build sitemap:', err);
    return base;
  }
}
