import { NextRequest } from 'next/server';
import { getPageDbConnection, getCategoryModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { updateCategorySchema } from '@/lib/validation/taxonomy';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pageDb = await getPageDbConnection();
    const Category = getCategoryModel(pageDb);
    const item = await Category.findById(id).lean().exec();
    if (!item) return apiError('Category not found', 404);
    return apiOk(item);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = updateCategorySchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Category = getCategoryModel(pageDb);

    const item = await Category.findById(id);
    if (!item) return apiError('Category not found', 404);

    const { slug, ...rest } = body;
    Object.assign(item, rest);
    if (slug !== undefined && slug !== item.slug) {
      item.slug = await generateUniqueSlug(Category, slug || item.name, { excludeId: id });
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
    const Category = getCategoryModel(pageDb);
    const deleted = await Category.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Category not found', 404);
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
