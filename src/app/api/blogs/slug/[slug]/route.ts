import { NextRequest } from 'next/server';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';

/**
 * GET /api/blogs/slug/[slug] — PUBLIC read of a published blog post.
 * Falls back to slugHistory so old URLs still resolve (with `movedFrom` set so
 * callers can issue a 301). Only published posts are returned.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const populate = [
      { path: 'categories', select: 'name slug' },
      { path: 'tags', select: 'name slug' },
      { path: 'authorId', select: 'name avatar bio socialLinks' },
    ];

    const publishedFilter = {
      $or: [{ status: 'published' }, { isPublished: true }],
    };

    let blog = await BlogPostModel.findOne({ slug, ...publishedFilter })
      .populate(populate)
      .lean()
      .exec();

    let movedFrom: string | null = null;
    if (!blog) {
      // Try a historical slug.
      const byHistory = await BlogPostModel.findOne({ slugHistory: slug, ...publishedFilter })
        .populate(populate)
        .lean()
        .exec();
      if (byHistory) {
        blog = byHistory;
        movedFrom = slug;
      }
    }

    if (!blog) return apiError('Blog post not found', 404);
    return apiOk({ ...blog, movedFrom });
  } catch (err) {
    return handleApiError(err);
  }
}
