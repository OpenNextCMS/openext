import { getPageDbConnection, getBlogPostModel } from '@/utils/db';

const populate = [
  { path: 'categories', select: 'name slug' },
  { path: 'tags', select: 'name slug' },
  { path: 'authorId', select: 'name avatar bio socialLinks' },
];

const publishedFilter = {
  $or: [{ status: 'published' }, { isPublished: true }],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PublishedPost {
  post: any;
  /** Set when the post was found via an old slug (caller should 301). */
  movedFrom: string | null;
}

/** Server-side fetch of a published blog post by slug (with slugHistory fallback). */
export async function getPublishedPostBySlug(slug: string): Promise<PublishedPost | null> {
  const pageDb = await getPageDbConnection();
  const BlogPost = getBlogPostModel(pageDb);

  const direct = await BlogPost.findOne({ slug, ...publishedFilter }).populate(populate).lean().exec();
  if (direct) return { post: direct, movedFrom: null };

  const byHistory = await BlogPost.findOne({ slugHistory: slug, ...publishedFilter })
    .populate(populate)
    .lean()
    .exec();
  if (byHistory) return { post: byHistory, movedFrom: slug };

  return null;
}

/** All published post slugs (for generateStaticParams / sitemap-like uses). */
export async function getPublishedSlugs(): Promise<string[]> {
  const pageDb = await getPageDbConnection();
  const BlogPost = getBlogPostModel(pageDb);
  const docs = await BlogPost.find(publishedFilter).select('slug').lean().exec();
  return docs.map((d) => (d as { slug?: string }).slug).filter(Boolean) as string[];
}
