import { NextRequest } from 'next/server';
import { getPageDbConnection, getCategoryModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { createCategorySchema } from '@/lib/validation/taxonomy';

/** GET /api/categories — list all categories (public). */
export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    const Category = getCategoryModel(pageDb);
    const items = await Category.find({}).sort({ name: 1 }).lean().exec();
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/categories — create (admin). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = createCategorySchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Category = getCategoryModel(pageDb);

    const slug = await generateUniqueSlug(Category, body.slug || body.name);
    const created = await Category.create({ ...body, slug });
    return apiOk(created.toObject(), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
