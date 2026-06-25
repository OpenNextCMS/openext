import { NextRequest } from 'next/server';
import { getPageDbConnection, getTagModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { createTagSchema } from '@/lib/validation/taxonomy';

/** GET /api/tags — list all tags (public). */
export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    const Tag = getTagModel(pageDb);
    const items = await Tag.find({}).sort({ name: 1 }).lean().exec();
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/tags — create (admin). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = createTagSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Tag = getTagModel(pageDb);
    const slug = await generateUniqueSlug(Tag, body.slug || body.name);
    const created = await Tag.create({ ...body, slug });
    return apiOk(created.toObject(), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
