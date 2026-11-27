import { requireAuth, type AuthUser } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import {
  hasCapability,
  getCapabilitiesForRole,
  type Capability,
} from '@/lib/rbac/capabilities';
import { isAdminTier, type RoleValue } from '@/lib/rbac/roles';
import {
  getEffectiveCoreRole,
  resolveRoleValue,
  ensurePluginUserTypesCache,
} from '@/lib/rbac/pluginUserTypes';
import { ensureCustomRolesCache } from '@/lib/rbac/customRoles';

export interface RbacContext {
  user: AuthUser;
  /** Resolved numeric role (core 0–3 or plugin-defined >= 100). */
  role: number;
  capabilities: Capability[];
}

export function getRoleFromUser(user: AuthUser | null | undefined): number {
  return resolveRoleValue(user?.role);
}

export async function requireRbac(): Promise<RbacContext> {
  const user = await requireAuth();
  // Custom/plugin role capabilities live in lazily-populated in-memory caches;
  // without warming them first, any role outside the 0–3 core tier silently
  // resolves to Author (the most restrictive fallback) on a cold module instance.
  await Promise.all([ensureCustomRolesCache(), ensurePluginUserTypesCache()]);
  const role = getRoleFromUser(user);
  return {
    user,
    role,
    capabilities: getCapabilitiesForRole(role),
  };
}

export async function requireCapability(capability: Capability): Promise<RbacContext> {
  const ctx = await requireRbac();
  if (!hasCapability(ctx.role, capability)) {
    throw new ApiError('Forbidden — insufficient permissions', 403);
  }
  return ctx;
}

export async function requireAnyCapability(...capabilities: Capability[]): Promise<RbacContext> {
  const ctx = await requireRbac();
  const allowed = capabilities.some((cap) => hasCapability(ctx.role, cap));
  if (!allowed) {
    throw new ApiError('Forbidden — insufficient permissions', 403);
  }
  return ctx;
}

export async function requireMinRole(minRole: RoleValue): Promise<RbacContext> {
  const ctx = await requireRbac();
  const coreRole = getEffectiveCoreRole(ctx.role);
  if (coreRole > minRole) {
    throw new ApiError('Forbidden — insufficient role', 403);
  }
  return ctx;
}

/** Authors may only mutate resources they created unless they have *.all capability. */
export function assertResourceOwnership(options: {
  role: number;
  ownerId: unknown;
  userId: string;
  editAllCap: Capability;
  editOwnCap: Capability;
}): void {
  const { role, ownerId, userId, editAllCap, editOwnCap } = options;
  const ownerIdStr = ownerId != null ? String(ownerId) : '';
  if (hasCapability(role, editAllCap)) return;
  if (hasCapability(role, editOwnCap) && ownerIdStr && ownerIdStr === String(userId)) return;
  throw new ApiError('Forbidden — you can only modify your own content', 403);
}

export function canPublishContent(role: number): boolean {
  return hasCapability(role, 'blogs.publish');
}

export { isAdminTier };
