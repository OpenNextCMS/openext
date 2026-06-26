import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
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

/**
 * Resolve the current user's plugin role from the session.
 * PLACEHOLDER: reads a `role` claim if present and maps the repo's roles
 * (SuperAdmin/Admin/Editor/Author) onto Owner/Admin/Editor/Viewer; defaults to
 * Admin when no claim is available. Wire to the real user→role lookup later.
 */
export async function getCurrentRole(): Promise<MenuRedirectRole> {
  const user = await getAuthUser();
  const claim = (user as { role?: string | number } | null)?.role;
  if (typeof claim === 'string') {
    const r = claim.toLowerCase();
    if (r.includes('owner') || r.includes('super')) return 'Owner';
    if (r.includes('admin')) return 'Admin';
    if (r.includes('editor')) return 'Editor';
    if (r.includes('viewer') || r.includes('author')) return 'Viewer';
  }
  if (typeof claim === 'number') {
    // Repo role values: SuperAdmin 0, Admin 1, Editor 2, Author 3.
    if (claim === 0) return 'Owner';
    if (claim === 1) return 'Admin';
    if (claim === 2) return 'Editor';
    return 'Viewer';
  }
  return 'Admin';
}
