import { NextRequest } from 'next/server';
import {
  getPageDbConnection,
  getMenuRedirectMappingModel,
  getMenuRedirectHistoryModel,
} from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { generateTargetUrl } from '@/lib/menu-redirect/url-generator';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/menu-redirect/history/undo { historyId } — re-applies the oldValue
 * of a history entry (restoring or deleting the mapping) and logs a new entry.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('update');
    const { historyId } = (await req.json()) as { historyId?: string };
    if (!historyId) return apiError('historyId is required', 400);

    const pageDb = await getPageDbConnection();
    const History = getMenuRedirectHistoryModel(pageDb);
    const Mapping = getMenuRedirectMappingModel(pageDb);

    const entry = (await History.findById(historyId).lean().exec()) as any;
    if (!entry) return apiError('History entry not found', 404);
    if (!String(entry.action).startsWith('mapping-')) {
      return apiError('Only mapping changes can be undone', 400);
    }

    const old = entry.oldValue as any;
    const menuItemId = entry.menuItemId as string | undefined;

    if (!old) {
      // The change was a creation → undo by deleting the current mapping.
      if (menuItemId) {
        const current = await Mapping.findOne({ menuItemId }).lean();
        if (current) {
          await Mapping.deleteOne({ _id: (current as any)._id });
          await logMenuRedirectHistory({
            action: 'mapping-deleted',
            menuItemId,
            oldValue: current,
            newValue: null,
            userId,
          });
        }
      }
      return apiOk({ undone: true });
    }

    // Restore the previous mapping state.
    const restore = {
      headerId: old.headerId,
      menuItemId: old.menuItemId,
      targetType: old.targetType,
      targetId: old.targetId,
      targetSlug: old.targetSlug,
      targetUrl: old.targetUrl || generateTargetUrl(old),
      openInNewTab: !!old.openInNewTab,
      nofollow: !!old.nofollow,
      trackClicks: !!old.trackClicks,
      enabled: old.enabled !== false,
      customClass: old.customClass,
      dataAttributes: old.dataAttributes,
      dynamicParams: old.dynamicParams,
    };

    const before = await Mapping.findOne({
      headerId: restore.headerId,
      menuItemId: restore.menuItemId,
    }).lean();

    const restored = await Mapping.findOneAndUpdate(
      { headerId: restore.headerId, menuItemId: restore.menuItemId },
      { $set: restore },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    await logMenuRedirectHistory({
      action: 'mapping-updated',
      menuItemId: restore.menuItemId,
      oldValue: before ?? null,
      newValue: restored,
      userId,
    });

    return apiOk({ undone: true, mapping: restored });
  } catch (err) {
    return handleApiError(err);
  }
}
