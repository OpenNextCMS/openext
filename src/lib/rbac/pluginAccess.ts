import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { findCustomRoleByValueSync } from '@/lib/rbac/customRoleCache';
import {
  findPluginUserTypeByValueSync,
  resolveRoleValue,
} from '@/lib/rbac/pluginUserTypes';
import type { PluginFeatureCatalog } from '@/lib/plugins/pluginRolesSchema';
import { buildPluginFeatureCatalog } from '@/lib/plugins/pluginRolesSchema';

export interface PluginOption {
  pluginId: string;
  name: string;
  icon?: string;
  kind?: string;
  source?: string;
  permissions: string[];
  featureCatalog: PluginFeatureCatalog;
}

/** Installed + active plugins, for the role-management "which plugins can this role see" picker. */
export async function listActivePluginOptions(): Promise<PluginOption[]> {
  await getUserDbConnection();
  const PluginModel = getPluginModel();
  const docs = await PluginModel.find(
    { isActive: true },
    {
      pluginId: 1,
      name: 1,
      icon: 1,
      kind: 1,
      source: 1,
      permissions: 1,
      adminNav: 1,
      featureCatalog: 1,
    }
  ).lean();

  return docs.map((doc) => {
    const permissions = Array.isArray(doc.permissions)
      ? doc.permissions.filter((p): p is string => typeof p === 'string')
      : [];
    const stored = doc.featureCatalog as PluginFeatureCatalog | undefined;
    const featureCatalog =
      stored && Array.isArray(stored.pages)
        ? {
            pages: stored.pages,
            permissions:
              Array.isArray(stored.permissions) && stored.permissions.length > 0
                ? stored.permissions
                : permissions.map((id) => ({
                    id,
                    label: id,
                  })),
          }
        : buildPluginFeatureCatalog({
            adminNav: doc.adminNav,
            permissions,
          });

    return {
      pluginId: doc.pluginId,
      name: doc.name,
      icon: doc.icon,
      kind: doc.kind,
      source: doc.source,
      permissions,
      featureCatalog,
    };
  });
}

/**
 * Resolve which of the currently-active plugin ids this role may see/use.
 * - Plugin-defined roles (api/roles.js): only the plugin that registered them
 * - Custom roles with allowedPlugins: that explicit list
 * - Core / unrestricted custom roles: every active plugin
 */
export function getAllowedPluginIds(
  role: number | string | undefined | null,
  activePluginIds: string[]
): string[] {
  const resolved = resolveRoleValue(role);

  const pluginType = findPluginUserTypeByValueSync(resolved);
  if (pluginType) {
    return activePluginIds.filter((id) => id === pluginType.pluginId);
  }

  const custom = findCustomRoleByValueSync(resolved);
  if (custom?.allowedPlugins) {
    const allowed = new Set(custom.allowedPlugins);
    return activePluginIds.filter((id) => allowed.has(id));
  }
  return [...activePluginIds];
}

export function canUsePlugin(
  role: number | string | undefined | null,
  pluginId: string,
  activePluginIds: string[]
): boolean {
  return getAllowedPluginIds(role, activePluginIds).includes(pluginId);
}
