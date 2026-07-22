import fs from 'fs/promises';
import path from 'path';

/** Backend plugin code lives outside public/ — never served as static assets. */
export const PLUGINS_BACKEND_DIR = path.join(process.cwd(), 'plugins');

export function getBackendPluginDirectory(pluginId: string): string {
  return path.join(PLUGINS_BACKEND_DIR, pluginId);
}

export async function ensureBackendPluginsDirectory(): Promise<void> {
  await fs.mkdir(PLUGINS_BACKEND_DIR, { recursive: true });
}

export async function backendPluginDirectoryExists(pluginId: string): Promise<boolean> {
  try {
    const stats = await fs.stat(getBackendPluginDirectory(pluginId));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function removeBackendPluginDirectory(pluginId: string): Promise<void> {
  const pluginDir = getBackendPluginDirectory(pluginId);
  try {
    await fs.rm(pluginDir, { recursive: true, force: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }
}

export function getPluginApiPrefix(pluginId: string): string {
  return `/api/plugins/${pluginId}`;
}

/** Allowed top-level folders inside a plugin ZIP (frontend + backend). */
export const ALLOWED_PLUGIN_TOP_LEVEL = new Set([
  'admin',
  'block',
  'assets',
  'fonts',
  'dashboard',
  'server',
]);

/** Paths that must never be extracted from a plugin ZIP. */
export const BLOCKED_PLUGIN_PATH_SEGMENTS = new Set([
  '.env',
  'node_modules',
  '.git',
  '.gitignore',
  '.npmrc',
]);

export function isFrontendRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath === 'manifest.json') return true;
  if (relativePath === 'package.json') return false;
  if (relativePath.startsWith('server/') || relativePath === 'server') return false;
  return true;
}

export function isBackendRelativePath(relativePath: string): boolean {
  if (relativePath === 'package.json') return true;
  return relativePath.startsWith('server/') || relativePath === 'server';
}
