import { NextRequest } from 'next/server';
import { getPageDbConnection, getTagModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { updateTagSchema } from '@/lib/validation/taxonomy';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Tag = getTagModel(pageDb);
    const item = await Tag.findById(id).lean().exec();
    if (!item) return apiError('Tag not found', 404);
    return apiOk(item);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = updateTagSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Tag = getTagModel(pageDb);

    const item = await Tag.findById(id);
    if (!item) return apiError('Tag not found', 404);

    const { slug, ...rest } = body;
    Object.assign(item, rest);
    if (slug !== undefined && slug !== item.slug) {
      item.slug = await generateUniqueSlug(Tag, slug || item.name, { excludeId: id });
    }
    await item.save();
    return apiOk(item.toObject());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Tag = getTagModel(pageDb);
    const deleted = await Tag.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Tag not found', 404);
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
