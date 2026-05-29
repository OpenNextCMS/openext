import { NextRequest } from 'next/server';
import type { FilterQuery } from 'mongoose';
import { getPageDbConnection, getCommentModel } from '@/utils/db';
import type { ICommentDocument } from '@/types/index';
import { getAuthUser, requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { createCommentSchema } from '@/lib/validation/comment';

/**
 * GET /api/comments
 * - Public callers: only approved comments, and a blogId is required.
 * - Admins: may filter by status (including pending/spam) across posts.
 * Query: ?blogId=&status=&page=&limit=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blogId = searchParams.get('blogId') || undefined;
    const status = searchParams.get('status') || undefined;
    const { page, limit } = parsePagination(searchParams);

    const isAdmin = !!(await getAuthUser());

    const pageDb = await getPageDbConnection();
    const Comment = getCommentModel(pageDb);

    const filter: FilterQuery<ICommentDocument> = {};
    if (blogId) filter.blogId = blogId;
    if (isAdmin) {
      if (status) filter.status = status as ICommentDocument['status'];
    } else {
      // Public reads are restricted to approved comments on a specific post.
      filter.status = 'approved';
      if (!blogId) return apiOk([], { meta: { total: 0, page, limit, hasMore: false } });
    }

    const [items, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      Comment.countDocuments(filter),
    ]);

    return apiOk(items, { meta: { total, page, limit, hasMore: page * limit < total } });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/comments — PUBLIC. Always created with status "pending".
 */
export async function POST(req: NextRequest) {
  try {
    const body = createCommentSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Comment = getCommentModel(pageDb);

    const created = await Comment.create({ ...body, status: 'pending' });
    return apiOk(
      { _id: created._id, message: 'Comment submitted and awaiting moderation.' },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
