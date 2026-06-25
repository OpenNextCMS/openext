import { Types } from 'mongoose';
import { getPageDbConnection, getMenuRedirectHistoryModel } from '@/utils/db';
import type { MenuRedirectAction } from '@/types/menu-redirect';

/**
 * Append an entry to the Menu Redirect audit log (page DB). Best-effort:
 * failures are logged but never block the caller.
 */
export async function logMenuRedirectHistory(entry: {
  action: MenuRedirectAction;
  menuItemId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
}): Promise<void> {
  try {
    const pageDb = await getPageDbConnection();
    const History = getMenuRedirectHistoryModel(pageDb);
    await History.create({
      action: entry.action,
      menuItemId: entry.menuItemId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      userId: entry.userId ? new Types.ObjectId(entry.userId) : undefined,
    });
  } catch (e) {
    console.warn('[menu-redirect] history log failed:', e);
  }
}
