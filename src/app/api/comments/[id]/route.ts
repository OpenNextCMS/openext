import { NextRequest } from 'next/server';
import { getPageDbConnection, getCommentModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { updateCommentSchema } from '@/lib/validation/comment';

/** PUT /api/comments/[id] — moderate (approve/spam/pending). Admin only. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const { status } = updateCommentSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Comment = getCommentModel(pageDb);
    const updated = await Comment.findByIdAndUpdate(id, { status }, { new: true }).lean().exec();
    if (!updated) return apiError('Comment not found', 404);
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/comments/[id] — admin only. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Comment = getCommentModel(pageDb);
    const deleted = await Comment.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Comment not found', 404);
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
