import { NextRequest } from 'next/server';
import { getPageDbConnection, getAuthorModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { updateAuthorSchema } from '@/lib/validation/author';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Author = getAuthorModel(pageDb);
    const item = await Author.findById(id).lean().exec();
    if (!item) return apiError('Author not found', 404);
    return apiOk(item);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = updateAuthorSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Author = getAuthorModel(pageDb);
    const updated = await Author.findByIdAndUpdate(id, body, { new: true }).lean().exec();
    if (!updated) return apiError('Author not found', 404);
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Author = getAuthorModel(pageDb);
    const deleted = await Author.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Author not found', 404);
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
