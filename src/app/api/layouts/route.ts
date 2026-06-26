import { NextRequest } from 'next/server';
import { getPageDbConnection, getLayoutModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { createLayoutSchema } from '@/lib/validation/layout';

/** GET /api/layouts — list layouts, or ?active=1 for the active one (public). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageDb = await getPageDbConnection();
    const Layout = getLayoutModel(pageDb);

    if (searchParams.get('active')) {
      const active = await Layout.findOne({ isActive: true }).lean().exec();
      return apiOk(active);
    }
    const items = await Layout.find({}).sort({ updatedAt: -1 }).lean().exec();
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/layouts — create (admin). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = createLayoutSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Layout = getLayoutModel(pageDb);

    if (body.isActive) {
      await Layout.updateMany({ isActive: true }, { $set: { isActive: false } });
    }
    const created = await Layout.create({ name: 'Blog Layout', ...body });
    return apiOk(created.toObject(), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
