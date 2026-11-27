import { findPluginUserTypeByValueSync, resolveRoleValue } from '@/lib/rbac/pluginUserTypes';
import { findCustomRoleByValueSync } from '@/lib/rbac/customRoleCache';
import { normalizeRole, ROLE } from '@/lib/rbac/roles';

export {
  PLUGIN_ROLE_MIN,
  type PluginUserTypeDefinition,
  parsePluginUserTypesFromManifest,
  registerPluginUserTypes,
  unregisterPluginUserTypes,
  syncPluginUserTypesFromStore,
  ensurePluginUserTypesCache,
  isAllowedRoleValue,
  getRoleLabel,
  resolveRoleValue,
  getEffectiveCoreRole,
  isCoreRoleValue,
  isPluginRoleValue,
  findPluginUserTypeByValue,
  findPluginUserTypeByValueSync,
} from '@/lib/rbac/pluginUserTypes';

/**
 * Resolve which manifest permissions a user receives for uploaded plugin APIs.
 * - SuperAdmin / Admin: all plugin permissions
 * - Editor: read/send/write except *.configure
 * - Author: no plugin API permissions
 * - Plugin user types: only the permissions declared for that type
 * - Custom roles: permissions selected for that plugin (or all if unrestricted)
 */
export function resolvePluginPermissionsForRole(
  pluginPermissions: string[],
  role: number | string | undefined | null,
  pluginId?: string
): string[] {
  const resolved = resolveRoleValue(role);
  const pluginType = findPluginUserTypeByValueSync(resolved);

  if (pluginType) {
    if (pluginId && pluginType.pluginId !== pluginId) {
      return [];
    }
    return pluginType.permissions.filter((perm) => pluginPermissions.includes(perm));
  }

  const custom = findCustomRoleByValueSync(resolved);
  if (custom) {
    if (pluginId && custom.allowedPlugins && !custom.allowedPlugins.includes(pluginId)) {
      return [];
    }
    if (pluginId) {
      const entry = custom.pluginPageAccess?.find((item) => item.pluginId === pluginId);
      if (entry?.permissions) {
        return entry.permissions.filter((perm) => pluginPermissions.includes(perm));
      }
    }
    if (!pluginId || !custom.allowedPlugins || custom.allowedPlugins.includes(pluginId)) {
      return [...pluginPermissions];
    }
    return [];
  }

  const r = normalizeRole(resolved);

  if (r === ROLE.SUPER_ADMIN || r === ROLE.ADMIN) {
    return [...pluginPermissions];
  }

  if (r === ROLE.EDITOR) {
    return pluginPermissions.filter((perm) => !perm.endsWith('.configure'));
  }

  return [];
}
