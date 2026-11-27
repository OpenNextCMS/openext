import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import { normalizeRole, ROLE } from '@/lib/rbac/roles';
import type { MenuRedirectRole, MenuRedirectAccessAction } from '@/types/menu-redirect';

const WRITE_ACTIONS: MenuRedirectAccessAction[] = ['create', 'update', 'delete', 'bulk'];
const LIFECYCLE_ACTIONS: MenuRedirectAccessAction[] = ['install', 'enable', 'disable', 'uninstall'];

/**
 * Role capabilities:
 *  - Owner/Admin: read, write, lifecycle
 *  - Editor: read only
 *  - Viewer: no access
 */
export function can(role: MenuRedirectRole, action: MenuRedirectAccessAction): boolean {
  if (role === 'Viewer') return false;
  if (action === 'read') return role === 'Owner' || role === 'Admin' || role === 'Editor';
  if (LIFECYCLE_ACTIONS.includes(action) || WRITE_ACTIONS.includes(action)) {
    return role === 'Owner' || role === 'Admin';
  }
  return false;
}

/** Throw a typed 403 unless the role permits the action. */
export function requireMenuRedirectAccess(
  role: MenuRedirectRole,
  action: MenuRedirectAccessAction
): void {
  if (!can(role, action)) {
    throw new ApiError('forbidden', 403);
  }
}

export function mapRoleToMenuRedirectTier(role: number | string | undefined | null): MenuRedirectRole {
  const r = normalizeRole(role);
  if (r === ROLE.SUPER_ADMIN) return 'Owner';
  if (r === ROLE.ADMIN) return 'Admin';
  if (r === ROLE.EDITOR) return 'Editor';
  return 'Viewer';
}

export async function getCurrentRole(): Promise<MenuRedirectRole> {
  const user = await getAuthUser();
  return mapRoleToMenuRedirectTier(user?.role);
}
