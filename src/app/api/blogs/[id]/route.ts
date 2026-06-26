import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { resolveStatusFields } from '@/lib/api/blogStatus';
import { calculateReadingTime } from '@/utils/blog';
import { updateBlogSchema } from '@/lib/validation/blog';
import type { ContentBlock } from '@/types/index';

const populate = [
  { path: 'categories', select: 'name slug' },
  { path: 'tags', select: 'name slug' },
  { path: 'authorId', select: 'name avatar bio socialLinks' },
];

/** GET /api/blogs/[id] — fetch one post by id (admin). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const blog = await BlogPostModel.findOne({ _id: id })
      .populate(populate)
      .lean()
      .exec();
    if (!blog) return apiError('Blog post not found', 404);
    return apiOk(blog);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/blogs/[id] — update a post (admin). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = updateBlogSchema.parse(await req.json());

    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const blog = await BlogPostModel.findOne({ _id: id });
    if (!blog) return apiError('Blog post not found', 404);

    const previousSlug = blog.slug;

    // Assign provided scalar/array fields (excluding ones with special handling).
    const { slug, status, scheduledAt, contentBlocks, ...rest } = body;
    Object.assign(blog, rest);

    if (contentBlocks !== undefined) {
      blog.contentBlocks = contentBlocks as ContentBlock[];
      blog.readingTime = calculateReadingTime(contentBlocks as ContentBlock[]);
    }

    // Slug change: ensure uniqueness and record the old slug for redirects.
    if (slug !== undefined && slug !== previousSlug) {
      blog.slug = await generateUniqueSlug(BlogPostModel, slug || blog.pageName, { excludeId: id });
      if (previousSlug && blog.slug !== previousSlug) {
        blog.slugHistory = Array.from(new Set([...(blog.slugHistory || []), previousSlug]));
      }
    }

    // Status transition (keeps isPublished/publishedAt in sync).
    if (status !== undefined) {
      const fields = resolveStatusFields(status, {
        scheduledAt: scheduledAt ?? blog.scheduledAt ?? null,
        existingPublishedAt: blog.publishedAt ?? null,
      });
      Object.assign(blog, fields);
    } else if (scheduledAt !== undefined) {
      blog.scheduledAt = scheduledAt;
    }

    blog.modifications.push({
      modifiedBy: new Types.ObjectId(user.userId),
      modifiedAt: new Date(),
    });
    await blog.save();

    // Refresh public caches for current and previous URLs.
    try {
      revalidatePath(`/${blog.slug}`);
      if (previousSlug && previousSlug !== blog.slug) revalidatePath(`/${previousSlug}`);
      revalidatePath('/blogs');
    } catch (e) {
      console.warn('revalidate failed', e);
    }

    return apiOk(blog.toObject());
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/blogs/[id] — delete a post (admin). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const deleted = await BlogPostModel.findOneAndDelete({ _id: id }).lean().exec();
    if (!deleted) return apiError('Blog post not found', 404);

    try {
      revalidatePath('/blogs');
      if ((deleted as { slug?: string }).slug) {
        revalidatePath(`/${(deleted as { slug?: string }).slug}`);
      }
    } catch (e) {
      console.warn('revalidate failed', e);
    }

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
