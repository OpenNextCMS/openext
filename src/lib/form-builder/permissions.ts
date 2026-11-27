import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import { normalizeRole, ROLE } from '@/lib/rbac/roles';
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

/** Map CMS numeric role to Form Builder tier. Authors have no form-builder access. */
export function mapRoleToFormBuilderTier(role: number | string | undefined | null): FormBuilderRole {
  const r = normalizeRole(role);
  if (r === ROLE.SUPER_ADMIN) return 'Owner';
  if (r === ROLE.ADMIN) return 'Admin';
  if (r === ROLE.EDITOR) return 'Editor';
  return 'Viewer';
}

export async function getCurrentFormRole(): Promise<FormBuilderRole> {
  const user = await getAuthUser();
  return mapRoleToFormBuilderTier(user?.role);
}
