import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';

/** GET /api/menu-redirect/list?headerId= — mappings for a header (read). */
export async function GET(req: NextRequest) {
  try {
    await guardMenuRedirect('read');
    const { searchParams } = new URL(req.url);
    const headerId = searchParams.get('headerId') || undefined;

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);
    const filter = headerId ? { headerId } : {};
    const items = await Mapping.find(filter).lean().exec();
    return apiOk(items, { meta: { total: items.length, hasMore: false } });
  } catch (err) {
    return handleApiError(err);
  }
}
