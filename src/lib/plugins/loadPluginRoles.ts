import fs from 'fs/promises';
import path from 'path';
import { PLUGIN_API_DIR } from '@/lib/plugins/pluginLayout';
import {
  parsePluginUserTypesFromManifest,
  type PluginUserTypeDraft,
} from '@/lib/rbac/pluginUserTypes';
import {
  parsePluginRolesFile,
  peekRolesPagesCatalog,
  buildPluginFeatureCatalog,
  type PluginFeatureCatalog,
} from '@/lib/plugins/pluginRolesSchema';
import { clearCjsModuleCache, loadCjsModule } from '@/lib/plugins/server/loadCjsModule';
import type { PluginAdminNavItem } from '@/types/index';

export type { PluginFeatureCatalog };

/**
 * Load plugin roles from `api/roles.js` (or compiled `api/roles.ts`).
 *
 * Official format:
 *   module.exports = {
 *     pages: [{ id, label?, features? }],  // optional catalog
 *     roles: [{ id, name, permissions, pages? }],
 *   }
 *
 * Legacy: module.exports = [ { id, name, permissions }, ... ]
 */
export async function loadPluginRolesFromApiFolder(
  pluginId: string,
  backendPluginDir: string,
  manifestPermissions: string[],
  adminNav?: PluginAdminNavItem[]
): Promise<{ roles: PluginUserTypeDraft[]; featureCatalog: PluginFeatureCatalog } | null> {
  const candidates = [
    path.join(backendPluginDir, PLUGIN_API_DIR, 'roles.js'),
    path.join(backendPluginDir, PLUGIN_API_DIR, 'roles.cjs'),
    path.join(backendPluginDir, 'server', 'roles.js'),
    path.join(backendPluginDir, 'server', 'roles.cjs'),
  ];

  let rolesPath: string | null = null;
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      rolesPath = candidate;
      break;
    } catch {
      // try next
    }
  }

  if (!rolesPath) {
    return null;
  }

  let rawModule: unknown;
  try {
    clearCjsModuleCache(rolesPath);
    rawModule = loadCjsModule(rolesPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load api/roles.js for plugin "${pluginId}": ${message}`);
  }

  const roles = parsePluginRolesFile(
    pluginId,
    rawModule,
    manifestPermissions,
    adminNav,
    'api/roles.js'
  );

  const featureCatalog = buildPluginFeatureCatalog({
    pagesCatalog: peekRolesPagesCatalog(rawModule),
    adminNav,
    permissions: manifestPermissions,
  });

  return { roles, featureCatalog };
}

export interface ResolvedPluginRolesUpload {
  roles: PluginUserTypeDraft[];
  featureCatalog: PluginFeatureCatalog;
}

/** Resolve roles: prefer api/roles.js, fall back to legacy manifest.userTypes. */
export async function resolvePluginRolesForUpload(
  pluginId: string,
  backendPluginDir: string | null,
  manifestUserTypes: unknown,
  manifestPermissions: string[],
  adminNav?: PluginAdminNavItem[]
): Promise<ResolvedPluginRolesUpload> {
  const emptyCatalog = buildPluginFeatureCatalog({
    adminNav,
    permissions: manifestPermissions,
  });

  if (backendPluginDir) {
    const fromFile = await loadPluginRolesFromApiFolder(
      pluginId,
      backendPluginDir,
      manifestPermissions,
      adminNav
    );
    if (fromFile !== null) {
      return fromFile;
    }
  }

  if (manifestUserTypes !== undefined && manifestUserTypes !== null) {
    console.warn(
      `[plugins] "${pluginId}": manifest.userTypes is deprecated — move roles to api/roles.js`
    );
    const drafts = parsePluginUserTypesFromManifest(
      pluginId,
      manifestUserTypes,
      manifestPermissions,
      'manifest.json "userTypes"'
    );
    return {
      roles: drafts.map((draft) => ({
        ...draft,
        pageAccess: [{ id: '*', features: '*' as const }],
      })),
      featureCatalog: emptyCatalog,
    };
  }

  return { roles: [], featureCatalog: emptyCatalog };
}
