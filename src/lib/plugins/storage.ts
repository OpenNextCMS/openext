import fs from 'fs/promises';
import path from 'path';

export const PLUGINS_PUBLIC_DIR = path.join(process.cwd(), 'public', 'plugins');
export const MAX_PLUGIN_ZIP_BYTES = 25 * 1024 * 1024;
export const MAX_PLUGIN_FILES = 200;

export function getPluginDirectory(pluginId: string): string {
  return path.join(PLUGINS_PUBLIC_DIR, pluginId);
}

export function getPluginPublicBase(pluginId: string): string {
  return `/plugins/${pluginId}`;
}

export function toPublicPluginPath(pluginId: string, relativePath: string): string {
  return `${getPluginPublicBase(pluginId)}/${relativePath.replace(/\\/g, '/')}`;
}

export async function ensurePluginsDirectory(): Promise<void> {
  await fs.mkdir(PLUGINS_PUBLIC_DIR, { recursive: true });
}

export async function pluginDirectoryExists(pluginId: string): Promise<boolean> {
  try {
    const stats = await fs.stat(getPluginDirectory(pluginId));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function removePluginDirectory(pluginId: string): Promise<void> {
  const pluginDir = getPluginDirectory(pluginId);
  try {
    await fs.rm(pluginDir, { recursive: true, force: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }
}
