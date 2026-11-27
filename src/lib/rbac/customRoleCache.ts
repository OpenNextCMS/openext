import type { RoleValue } from '@/lib/rbac/roles';
import type { Capability } from '@/lib/rbac/capabilityDefinitions';

/** Admin-defined custom roles use numeric values 4–99 (core 0–3, plugin ≥100). */
export const CUSTOM_ROLE_MIN = 4;
export const CUSTOM_ROLE_MAX = 99;

export interface CustomRolePluginPageAccess {
  pluginId: string;
  pages: Array<{ id: string; features: string[] | '*' }>;
  /** Subset of the plugin's API permissions. Undefined = all permissions for allowed plugins. */
  permissions?: string[];
}

export interface CustomRoleDefinition {
  name: string;
  value: number;
  type: 'custom';
  baseRole: RoleValue;
  capabilities: Capability[];
  allowedComponents: string[];
  /** Installed+active plugin ids this role may see/use. Undefined = unrestricted (all active plugins). */
  allowedPlugins?: string[];
  /** Per-plugin page/feature/permission grants. */
  pluginPageAccess?: CustomRolePluginPageAccess[];
}

let cacheByValue = new Map<number, CustomRoleDefinition>();

export function isCustomRoleValue(role: number): boolean {
  return Number.isFinite(role) && role >= CUSTOM_ROLE_MIN && role <= CUSTOM_ROLE_MAX;
}

export function setCustomRolesCache(entries: CustomRoleDefinition[]): void {
  cacheByValue = new Map(entries.map((entry) => [entry.value, entry]));
}

export function clearCustomRolesCache(): void {
  cacheByValue = new Map();
}

export function findCustomRoleByValueSync(roleValue: number): CustomRoleDefinition | null {
  return cacheByValue.get(roleValue) ?? null;
}

export function getCustomRolePluginPageAccess(
  roleValue: number,
  pluginId: string
): CustomRolePluginPageAccess | null {
  const role = findCustomRoleByValueSync(roleValue);
  if (!role) return null;
  if (role.allowedPlugins && !role.allowedPlugins.includes(pluginId)) {
    return null;
  }
  return role.pluginPageAccess?.find((entry) => entry.pluginId === pluginId) ?? null;
}
