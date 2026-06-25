import { NextRequest } from 'next/server';
import {
  getPageDbConnection,
  getMenuRedirectMappingModel,
  getMenuRedirectAnalyticsModel,
} from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/** DELETE /api/menu-redirect/delete?id= — remove a mapping + its analytics. */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('delete');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return apiError('A mapping id is required', 400);

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);
    const Analytics = getMenuRedirectAnalyticsModel(pageDb);

    const deleted = await Mapping.findByIdAndDelete(id).lean().exec();
    if (!deleted) return apiError('Mapping not found', 404);
    await Analytics.deleteMany({ mappingId: id });

    await logMenuRedirectHistory({
      action: 'mapping-deleted',
      menuItemId: (deleted as { menuItemId?: string }).menuItemId,
      oldValue: deleted,
      newValue: null,
      userId,
    });

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
