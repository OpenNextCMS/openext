import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';

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

/**
 * Resolve the current user's theme role from the session.
 * PLACEHOLDER (mirrors menu-redirect/form-builder): maps the repo's roles
 * (SuperAdmin/Admin/Editor/Author) onto Owner/Admin/Editor/Viewer; defaults to
 * Admin when no claim is available. Wire to the real user→role lookup later.
 */
export async function getCurrentThemeRole(): Promise<ThemeRole> {
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
