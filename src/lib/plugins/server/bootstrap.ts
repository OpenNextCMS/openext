import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { enableBackendPlugin } from '@/lib/plugins/server/lifecycle';
import { backendPluginDirectoryExists } from '@/lib/plugins/server/storage';

let bootstrapPromise: Promise<void> | null = null;

export async function bootstrapBackendPlugins(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      await getUserDbConnection();
      const PluginModel = getPluginModel();

      const plugins = await PluginModel.find({
        isActive: true,
        hasBackend: true,
        serverEntry: { $exists: true, $ne: null },
      }).lean();

      for (const plugin of plugins) {
        if (!plugin.serverEntry) continue;
        const exists = await backendPluginDirectoryExists(plugin.pluginId);
        if (!exists) {
          console.warn(`[plugins] Backend files missing for "${plugin.pluginId}" — skipping load`);
          await PluginModel.updateOne(
            { pluginId: plugin.pluginId },
            { loadError: 'Backend plugin files not found on disk' }
          );
          continue;
        }

        try {
          await enableBackendPlugin({
            pluginId: plugin.pluginId,
            serverEntry: plugin.serverEntry,
            permissions: plugin.permissions || [],
          });
          console.log(`[plugins] Loaded backend plugin "${plugin.pluginId}"`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown load error';
          console.error(`[plugins] Failed to load "${plugin.pluginId}":`, error);
          await PluginModel.updateOne({ pluginId: plugin.pluginId }, { loadError: message });
        }
      }
    } catch (error) {
      console.error('[plugins] Bootstrap failed:', error);
    }
  })();

  return bootstrapPromise;
}

export function ensureBackendPluginsBootstrapped(): void {
  void bootstrapBackendPlugins();
}
