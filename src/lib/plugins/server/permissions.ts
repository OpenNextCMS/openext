import { getUserDbConnection } from '@/utils/db';
import { getSettingsModel } from '@/utils/db';

interface PluginPermissionsStore {
  [pluginId: string]: string[];
}

async function readPermissionsStore(): Promise<PluginPermissionsStore> {
  await getUserDbConnection();
  const Settings = getSettingsModel();
  const settings = await Settings.findOne({}).lean();
  const store = (settings as { pluginPermissions?: PluginPermissionsStore } | null)?.pluginPermissions;
  return store && typeof store === 'object' ? { ...store } : {};
}

async function writePermissionsStore(store: PluginPermissionsStore): Promise<void> {
  await getUserDbConnection();
  const Settings = getSettingsModel();
  await Settings.updateOne({}, { $set: { pluginPermissions: store } }, { upsert: true });
}

export async function registerPluginPermissions(pluginId: string, permissions: string[]): Promise<void> {
  if (permissions.length === 0) return;

  const store = await readPermissionsStore();
  const existing = new Set(store[pluginId] || []);
  for (const permission of permissions) {
    existing.add(permission);
  }
  store[pluginId] = [...existing];
  await writePermissionsStore(store);
}

export async function unregisterPluginPermissions(
  pluginId: string,
  permissions: string[] = []
): Promise<void> {
  const store = await readPermissionsStore();
  if (permissions.length > 0) {
    const remaining = (store[pluginId] || []).filter((perm) => !permissions.includes(perm));
    if (remaining.length > 0) store[pluginId] = remaining;
    else delete store[pluginId];
  } else {
    delete store[pluginId];
  }
  await writePermissionsStore(store);
}

export async function getPluginPermissions(pluginId: string): Promise<string[]> {
  const store = await readPermissionsStore();
  return store[pluginId] || [];
}

export async function getAllPluginPermissions(): Promise<PluginPermissionsStore> {
  return readPermissionsStore();
}

export function resolveUserPermissions(
  pluginId: string,
  pluginPermissions: string[],
  role?: number | string
): string[] {
  if (typeof role === 'number' && role <= 1) {
    return [...pluginPermissions];
  }
  return [];
}
