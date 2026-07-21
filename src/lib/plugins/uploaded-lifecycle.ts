import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { ApiError } from '@/lib/api/errors';

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/;

export function assertSafePluginId(pluginId: string): string {
  const id = (pluginId || '').trim().toLowerCase();
  if (!PLUGIN_ID_PATTERN.test(id)) {
    throw new ApiError('Invalid plugin id', 400);
  }
  return id;
}

const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export function assertSafeDataKey(key: string): string {
  const k = (key || '').trim();
  if (!KEY_PATTERN.test(k)) {
    throw new ApiError(
      'Invalid data key (use 1-128 chars: letters, numbers, . _ -)',
      400
    );
  }
  return k;
}

/** Ensure the plugin exists and is active (data host for uploaded packages). */
export async function requireActiveUploadedPlugin(pluginId: string) {
  const id = assertSafePluginId(pluginId);
  await getUserDbConnection();
  const PluginModel = getPluginModel();
  const plugin = await PluginModel.findOne({ pluginId: id }).lean();

  if (!plugin) {
    throw new ApiError('Plugin not found', 404);
  }
  if (!plugin.isActive) {
    throw new ApiError('Plugin is disabled', 403);
  }

  const isUploaded =
    plugin.source === 'uploaded' ||
    plugin.entryPoint?.startsWith('/plugins/') ||
    plugin.adminEntry?.startsWith('/plugins/') ||
    plugin.blockEntry?.startsWith('/plugins/');

  if (!isUploaded) {
    throw new ApiError('Data host is only available for uploaded plugins', 403);
  }

  return plugin;
}
