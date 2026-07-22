import { getUserDbConnection } from '@/utils/db';
import { getPluginModel } from '@/utils/db';
import type { IPluginDocument } from '@/types/index';
import {
  installPluginDependencies,
  runInstallHook,
  runUninstallHook,
} from '@/lib/plugins/server/hooks';
import { loadBackendPlugin, unloadBackendPlugin } from '@/lib/plugins/server/loader';
import { runPluginMigrations, clearPluginMigrationHistory } from '@/lib/plugins/server/migrations';
import { registerPluginPermissions, unregisterPluginPermissions } from '@/lib/plugins/server/permissions';
import { removePluginDirectory } from '@/lib/plugins/storage';
import { removeBackendPluginDirectory } from '@/lib/plugins/server/storage';

export interface BackendInstallOptions {
  pluginId: string;
  serverEntry: string;
  migrations?: string[];
  permissions?: string[];
  installHook?: string;
  uninstallHook?: string;
  dependencies?: string[];
  enableAfterInstall?: boolean;
}

export interface BackendInstallResult {
  migrationsRun: string[];
  routesRegistered: number;
}

export async function installBackendPlugin(options: BackendInstallOptions): Promise<BackendInstallResult> {
  const {
    pluginId,
    serverEntry,
    migrations = [],
    permissions = [],
    installHook,
    dependencies = [],
    enableAfterInstall = true,
  } = options;

  await installPluginDependencies(pluginId, dependencies);

  const migrationsRun = await runPluginMigrations(pluginId, migrations, permissions);
  await runInstallHook(pluginId, installHook, permissions);
  await registerPluginPermissions(pluginId, permissions);

  let routesRegistered = 0;
  if (enableAfterInstall) {
    const loaded = await loadBackendPlugin({ pluginId, serverEntry, permissions });
    routesRegistered = loaded.app.getRouteCount();
  }

  await getUserDbConnection();
  const PluginModel = getPluginModel();
  await PluginModel.updateOne(
    { pluginId },
    {
      hasBackend: true,
      serverEntry,
      apiPrefix: `/api/plugins/${pluginId}`,
      permissions,
      dependencies,
      installHook,
      uninstallHook: options.uninstallHook,
      loadedAt: enableAfterInstall ? new Date() : undefined,
      loadError: undefined,
    }
  );

  return { migrationsRun, routesRegistered };
}

export async function enableBackendPlugin(plugin: Pick<IPluginDocument, 'pluginId' | 'serverEntry' | 'permissions'>): Promise<void> {
  if (!plugin.serverEntry) return;
  await loadBackendPlugin({
    pluginId: plugin.pluginId,
    serverEntry: plugin.serverEntry,
    permissions: plugin.permissions || [],
  });

  await getUserDbConnection();
  const PluginModel = getPluginModel();
  await PluginModel.updateOne(
    { pluginId: plugin.pluginId },
    { loadedAt: new Date(), loadError: undefined }
  );
}

export async function disableBackendPlugin(pluginId: string): Promise<void> {
  await unloadBackendPlugin(pluginId);

  await getUserDbConnection();
  const PluginModel = getPluginModel();
  await PluginModel.updateOne({ pluginId }, { loadedAt: undefined });
}

export async function uninstallBackendPlugin(
  pluginId: string,
  options: { uninstallHook?: string; permissions?: string[]; dropMigrations?: boolean } = {}
): Promise<void> {
  await disableBackendPlugin(pluginId);

  try {
    await runUninstallHook(pluginId, options.uninstallHook, options.permissions || []);
  } catch (error) {
    console.error(`[plugin:${pluginId}] uninstall hook failed:`, error);
  }

  await unregisterPluginPermissions(pluginId, options.permissions || []);

  if (options.dropMigrations) {
    await clearPluginMigrationHistory(pluginId);
  }

  await removeBackendPluginDirectory(pluginId);

  await getUserDbConnection();
  const PluginModel = getPluginModel();
  await PluginModel.updateOne(
    { pluginId },
    {
      hasBackend: false,
      serverEntry: undefined,
      apiPrefix: undefined,
      permissions: [],
      dependencies: [],
      installHook: undefined,
      uninstallHook: undefined,
      loadedAt: undefined,
      loadError: undefined,
    }
  );
}

export async function rollbackPluginInstall(pluginId: string): Promise<void> {
  await disableBackendPlugin(pluginId).catch(() => undefined);
  await removePluginDirectory(pluginId);
  await removeBackendPluginDirectory(pluginId);
  await clearPluginMigrationHistory(pluginId).catch(() => undefined);
}
