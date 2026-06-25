import { requireAuth } from '@/lib/api/auth';
import { getCurrentThemeRole, requireThemeAccess, type ThemeAction, type ThemeRole } from './permissions';
import { resolveTenantId } from './tenant';

export interface ThemeGuardContext {
  userId: string;
  role: ThemeRole;
  tenantId: string;
}

/**
 * Gate a Theme management action. The Theme Builder is a CORE feature (no
 * plugin lifecycle), so the gate is simply: authenticated user → role check.
 * Returns the resolved context for the handler to use.
 */
export async function guardTheme(action: ThemeAction): Promise<ThemeGuardContext> {
  const user = await requireAuth();
  const role = await getCurrentThemeRole();
  requireThemeAccess(role, action);
  return { userId: user.userId, role, tenantId: resolveTenantId() };
}
