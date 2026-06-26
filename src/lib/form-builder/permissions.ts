import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import type { FormPermission } from './constants';

/**
 * RBAC for the Form Builder plugin. The repo has no named-permission registry —
 * access is role-tiered. We map the seven named form permissions onto the same
 * Owner/Admin/Editor/Viewer tiers used by the Menu Redirect plugin:
 *   - Owner/Admin: every permission (read + write + lifecycle)
 *   - Editor:      read-only (view forms, submissions, analytics)
 *   - Viewer:      no access
 */

export type FormBuilderRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export type FormLifecycleAction = 'install' | 'enable' | 'disable' | 'uninstall';
export type FormAccessAction = FormPermission | FormLifecycleAction;

const READ_PERMISSIONS: FormPermission[] = [
  'forms.view',
  'forms.submissions.view',
  'forms.analytics.view',
];

const WRITE_PERMISSIONS: FormPermission[] = [
  'forms.create',
  'forms.edit',
  'forms.delete',
  'forms.publish',
];

const LIFECYCLE_ACTIONS: FormLifecycleAction[] = ['install', 'enable', 'disable', 'uninstall'];

export function can(role: FormBuilderRole, action: FormAccessAction): boolean {
  if (role === 'Viewer') return false;
  if (READ_PERMISSIONS.includes(action as FormPermission)) {
    return role === 'Owner' || role === 'Admin' || role === 'Editor';
  }
  if (
    WRITE_PERMISSIONS.includes(action as FormPermission) ||
    LIFECYCLE_ACTIONS.includes(action as FormLifecycleAction)
  ) {
    return role === 'Owner' || role === 'Admin';
  }
  return false;
}

/** Throw a typed 403 unless the role permits the action. */
export function requireFormAccess(role: FormBuilderRole, action: FormAccessAction): void {
  if (!can(role, action)) {
    throw new ApiError('forbidden', 403);
  }
}

/**
 * Resolve the current user's plugin role from the session.
 * PLACEHOLDER: maps the repo's numeric roles (SuperAdmin 0 / Admin 1 / Editor 2
 * / Author 3) onto Owner/Admin/Editor/Viewer; defaults to Admin when no claim is
 * available. Wire to the real user→role lookup later. Matches Menu Redirect.
 */
export async function getCurrentFormRole(): Promise<FormBuilderRole> {
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
    if (claim === 0) return 'Owner';
    if (claim === 1) return 'Admin';
    if (claim === 2) return 'Editor';
    return 'Viewer';
  }
  return 'Admin';
}
