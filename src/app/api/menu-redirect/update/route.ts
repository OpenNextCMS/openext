import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel } from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { parseUpdate } from '@/lib/menu-redirect/validation';
import { generateTargetUrl } from '@/lib/menu-redirect/url-generator';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/** PUT /api/menu-redirect/update — patch a mapping by id. */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('update');
    const body = (await req.json()) as { id?: string; _id?: string } & Record<string, unknown>;
    const id = body.id || body._id;
    if (!id) return apiError('A mapping id is required', 400);

    const parsed = parseUpdate(body);
    if (parsed.error) return handleApiError(parsed.error);
    const patch = parsed.data;

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);

    const existing = await Mapping.findById(id);
    if (!existing) return apiError('Mapping not found', 404);
    const oldValue = existing.toObject();

    Object.assign(existing, patch);
    // Recompute the URL when any target field changed.
    if (
      patch.targetType !== undefined ||
      patch.targetId !== undefined ||
      patch.targetSlug !== undefined ||
      patch.targetUrl !== undefined ||
      patch.dynamicParams !== undefined
    ) {
      existing.targetUrl = generateTargetUrl(existing);
    }
    await existing.save();

    await logMenuRedirectHistory({
      action: 'mapping-updated',
      menuItemId: existing.menuItemId,
      oldValue,
      newValue: existing.toObject(),
      userId,
    });

    return apiOk(existing.toObject());
  } catch (err) {
    return handleApiError(err);
  }
}
