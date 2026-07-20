import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPageDbConnection, getLayoutModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { updateLayoutSchema } from '@/lib/validation/layout';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Layout = getLayoutModel(pageDb);
    const item = await Layout.findById(id).lean().exec();
    if (!item) return apiError('Layout not found', 404);
    return apiOk(item);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = updateLayoutSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Layout = getLayoutModel(pageDb);

    if (body.isActive) {
      await Layout.updateMany({ _id: { $ne: id }, isActive: true }, { $set: { isActive: false } });
    }
    const updated = await Layout.findByIdAndUpdate(id, body, { new: true }).lean().exec();
    if (!updated) return apiError('Layout not found', 404);

    try {
      revalidatePath('/blogs');
    } catch (e) {
      console.warn('revalidate failed', e);
    }
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
    const Layout = getLayoutModel(pageDb);
    const deleted = await Layout.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Layout not found', 404);
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
