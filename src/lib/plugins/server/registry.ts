import type { LoadedPlugin } from '@/lib/plugins/server/types';

const loadedPlugins = new Map<string, LoadedPlugin>();

export function getLoadedPlugin(pluginId: string): LoadedPlugin | undefined {
  return loadedPlugins.get(pluginId);
}

export function getAllLoadedPlugins(): LoadedPlugin[] {
  return [...loadedPlugins.values()];
}

export function setLoadedPlugin(plugin: LoadedPlugin): void {
  loadedPlugins.set(plugin.pluginId, plugin);
}

export function removeLoadedPlugin(pluginId: string): LoadedPlugin | undefined {
  const existing = loadedPlugins.get(pluginId);
  loadedPlugins.delete(pluginId);
  return existing;
}

export function clearLoadedPlugins(): void {
  loadedPlugins.clear();
}
