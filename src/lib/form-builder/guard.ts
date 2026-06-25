import { requireFormBuilderActive } from './lifecycle';
import { getCurrentFormRole, requireFormAccess } from './permissions';
import type { FormAccessAction, FormBuilderRole } from './permissions';
import { getAuthUser } from '@/lib/api/auth';
import { resolveTenantId } from './tenant';

/**
 * Standard guard for every Form Builder admin/API route.
 * Order (hard rule): plugin-active gate FIRST, then the role/permission check.
 * Returns the resolved role, userId and tenantId for the handler to use.
 */
export async function guardFormBuilder(
  action: FormAccessAction
): Promise<{ role: FormBuilderRole; userId?: string; tenantId: string }> {
  await requireFormBuilderActive(); // throws 404 not_installed / 409 disabled
  const user = await getAuthUser();
  const role = await getCurrentFormRole();
  requireFormAccess(role, action); // throws 403
  return { role, userId: user?.userId, tenantId: resolveTenantId() };
}
