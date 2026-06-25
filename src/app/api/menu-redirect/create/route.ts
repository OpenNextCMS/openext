import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { parseCreate } from '@/lib/menu-redirect/validation';
import { generateTargetUrl } from '@/lib/menu-redirect/url-generator';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/**
 * POST /api/menu-redirect/create — create/replace a mapping (upsert on the
 * unique {headerId, menuItemId}). Computes targetUrl and writes a history row.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('create');
    const parsed = parseCreate(await req.json());
    if (parsed.error) return handleApiError(parsed.error);
    const data = parsed.data;

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);

    const targetUrl = generateTargetUrl(data);
    const existing = await Mapping.findOne({
      headerId: data.headerId,
      menuItemId: data.menuItemId,
    }).lean();

    const doc = await Mapping.findOneAndUpdate(
      { headerId: data.headerId, menuItemId: data.menuItemId },
      { $set: { ...data, targetUrl } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    await logMenuRedirectHistory({
      action: existing ? 'mapping-updated' : 'mapping-created',
      menuItemId: data.menuItemId,
      oldValue: existing ?? null,
      newValue: doc,
      userId,
    });

    return apiOk(doc, { status: existing ? 200 : 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
