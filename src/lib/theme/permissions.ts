import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import { normalizeRole, ROLE } from '@/lib/rbac/roles';

/** Theme management roles (mapped from the repo's user roles). */
export type ThemeRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export type ThemeAction = 'view' | 'create' | 'update' | 'delete' | 'duplicate' | 'activate';

const WRITE_ACTIONS: ThemeAction[] = ['create', 'update', 'delete', 'duplicate', 'activate'];

/**
 * Role capabilities for the Theme Builder:
 *  - Owner (SuperAdmin) / Admin: view + all writes (manage themes)
 *  - Editor: view only
 *  - Viewer/Author: no access
 */
export function can(role: ThemeRole, action: ThemeAction): boolean {
  if (role === 'Viewer') return false;
  if (action === 'view') return role === 'Owner' || role === 'Admin' || role === 'Editor';
  if (WRITE_ACTIONS.includes(action)) return role === 'Owner' || role === 'Admin';
  return false;
}

/** Throw a typed 403 unless the role permits the action. */
export function requireThemeAccess(role: ThemeRole, action: ThemeAction): void {
  if (!can(role, action)) {
    throw new ApiError('forbidden', 403);
  }
}

export function mapRoleToThemeTier(role: number | string | undefined | null): ThemeRole {
  const r = normalizeRole(role);
  if (r === ROLE.SUPER_ADMIN) return 'Owner';
  if (r === ROLE.ADMIN) return 'Admin';
  if (r === ROLE.EDITOR) return 'Editor';
  return 'Viewer';
}

export async function getCurrentThemeRole(): Promise<ThemeRole> {
  const user = await getAuthUser();
  return mapRoleToThemeTier(user?.role);
}
