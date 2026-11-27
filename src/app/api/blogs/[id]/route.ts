import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import {
  requireAnyCapability,
  assertResourceOwnership,
  canPublishContent,
  requireRbac,
} from '@/lib/rbac';
import { ApiError } from '@/lib/api/errors';
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
    const ctx = await requireAnyCapability('blogs.view.all', 'blogs.view.own');
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const blog = await BlogPostModel.findOne({ _id: id })
      .populate(populate)
      .lean()
      .exec();
    if (!blog) return apiError('Blog post not found', 404);

    assertResourceOwnership({
      role: ctx.role,
      ownerId: blog.createdBy,
      userId: ctx.user.userId,
      editAllCap: 'blogs.view.all',
      editOwnCap: 'blogs.view.own',
    });

    return apiOk(blog);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/blogs/[id] — update a post (admin). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRbac();
    const { id } = await params;
    const body = updateBlogSchema.parse(await req.json());

    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const blog = await BlogPostModel.findOne({ _id: id });
    if (!blog) return apiError('Blog post not found', 404);

    assertResourceOwnership({
      role: ctx.role,
      ownerId: blog.createdBy,
      userId: ctx.user.userId,
      editAllCap: 'blogs.edit.all',
      editOwnCap: 'blogs.edit.own',
    });

    if (body.status === 'published' && !canPublishContent(ctx.role)) {
      throw new ApiError('Forbidden — authors cannot publish posts directly', 403);
    }

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
      modifiedBy: new Types.ObjectId(ctx.user.userId),
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
    const ctx = await requireRbac();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const BlogPostModel = getBlogPostModel(pageDb);

    const existing = await BlogPostModel.findOne({ _id: id }).lean();
    if (!existing) return apiError('Blog post not found', 404);

    assertResourceOwnership({
      role: ctx.role,
      ownerId: existing.createdBy,
      userId: ctx.user.userId,
      editAllCap: 'blogs.delete.all',
      editOwnCap: 'blogs.delete.own',
    });

    const deleted = await BlogPostModel.findOneAndDelete({ _id: id }).lean().exec();

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
