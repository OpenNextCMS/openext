import { requirePluginActive } from './lifecycle';
import { getCurrentRole, requireMenuRedirectAccess } from './permissions';
import { getAuthUser } from '@/lib/api/auth';
import type { MenuRedirectAccessAction, MenuRedirectRole } from '@/types/menu-redirect';

/**
 * Standard guard for every Menu Redirect route.
 * Order (per the plugin's hard rule): plugin-active gate FIRST, then role check.
 */
export async function guardMenuRedirect(
  action: MenuRedirectAccessAction
): Promise<{ role: MenuRedirectRole; userId?: string }> {
  await requirePluginActive(); // throws 404 not_installed / 409 disabled
  const user = await getAuthUser();
  const role = await getCurrentRole();
  requireMenuRedirectAccess(role, action); // throws 403
  return { role, userId: user?.userId };
}
