import { NextRequest } from 'next/server';
import { getPageDbConnection, getAuthorModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { createAuthorSchema } from '@/lib/validation/author';

/** GET /api/authors — list authors (public). */
export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    const Author = getAuthorModel(pageDb);
    const items = await Author.find({}).sort({ name: 1 }).lean().exec();
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/authors — create (admin). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = createAuthorSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Author = getAuthorModel(pageDb);
    const created = await Author.create(body);
    return apiOk(created.toObject(), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
