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
import { unregisterPluginUserTypes } from '@/lib/rbac/pluginUserTypes';
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

/** First enable runs migrations + install hook; later enables only reload routes. */
export async function activateBackendPlugin(
  plugin: Pick<
    IPluginDocument,
    | 'pluginId'
    | 'serverEntry'
    | 'permissions'
    | 'dependencies'
    | 'installHook'
    | 'uninstallHook'
    | 'loadedAt'
  > & { migrations?: string[] }
): Promise<BackendInstallResult | void> {
  if (!plugin.serverEntry) return;

  if (!plugin.loadedAt) {
    return installBackendPlugin({
      pluginId: plugin.pluginId,
      serverEntry: plugin.serverEntry,
      migrations: plugin.migrations || [],
      permissions: plugin.permissions || [],
      installHook: plugin.installHook,
      uninstallHook: plugin.uninstallHook,
      dependencies: plugin.dependencies || [],
      enableAfterInstall: true,
    });
  }

  await enableBackendPlugin(plugin);
}

export async function disableBackendPlugin(pluginId: string): Promise<void> {
  await unloadBackendPlugin(pluginId);

  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    // Use $unset — setting `undefined` is unreliable on MySQL/Postgres document adapters.
    await PluginModel.updateOne({ pluginId }, { $unset: { loadedAt: '' } });
  } catch (error) {
    console.error(`[plugin:${pluginId}] failed to clear loadedAt after disable:`, error);
  }
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

  try {
    await unregisterPluginPermissions(pluginId, options.permissions || []);
  } catch (error) {
    console.error(`[plugin:${pluginId}] unregister permissions failed:`, error);
  }

  if (options.dropMigrations) {
    try {
      await clearPluginMigrationHistory(pluginId);
    } catch (error) {
      console.error(`[plugin:${pluginId}] clear migration history failed:`, error);
    }
  }

  try {
    await removeBackendPluginDirectory(pluginId);
  } catch (error) {
    console.error(`[plugin:${pluginId}] remove backend directory failed:`, error);
  }

  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    await PluginModel.updateOne(
      { pluginId },
      {
        $set: {
          hasBackend: false,
          permissions: [],
          dependencies: [],
        },
        $unset: {
          serverEntry: '',
          apiPrefix: '',
          installHook: '',
          uninstallHook: '',
          loadedAt: '',
          loadError: '',
        },
      }
    );
  } catch (error) {
    // Plugin row may already be deleted by remove-plugin route.
    console.error(`[plugin:${pluginId}] clear backend metadata failed:`, error);
  }
}

export async function rollbackPluginInstall(pluginId: string): Promise<void> {
  await disableBackendPlugin(pluginId).catch(() => undefined);
  await unregisterPluginUserTypes(pluginId).catch(() => undefined);
  await removePluginDirectory(pluginId);
  await removeBackendPluginDirectory(pluginId);
  await clearPluginMigrationHistory(pluginId).catch(() => undefined);
}
