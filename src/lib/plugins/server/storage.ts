import fs from 'fs/promises';
import path from 'path';
import {
  UPLOADED_PLUGINS_BACKEND_ROOT,
  assertUploadPathNotInPublic,
} from '@/lib/dynamicContent';
import { PLUGIN_API_DIR, PLUGIN_UI_DIR } from '@/lib/plugins/pluginLayout';

/** Backend plugin storage — under `src/app/api/plugins/[pluginId]/`, never `public/`. */
export const PLUGINS_BACKEND_DIR = process.env.PLUGINS_BACKEND_DIR
  ? path.resolve(process.env.PLUGINS_BACKEND_DIR)
  : UPLOADED_PLUGINS_BACKEND_ROOT;

function resolveBackendRoot(): string {
  const root = PLUGINS_BACKEND_DIR;
  assertUploadPathNotInPublic(root, 'PLUGINS_BACKEND_DIR');
  return root;
}

export function getBackendPluginDirectory(pluginId: string): string {
  const dir = path.join(resolveBackendRoot(), pluginId);
  assertUploadPathNotInPublic(dir, 'Plugin backend directory');
  return dir;
}

export async function ensureBackendPluginsDirectory(): Promise<void> {
  await fs.mkdir(resolveBackendRoot(), { recursive: true });
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

/** Allowed top-level folders inside a plugin package (ui/api layout + legacy). */
export const ALLOWED_PLUGIN_TOP_LEVEL = new Set([
  PLUGIN_UI_DIR,
  PLUGIN_API_DIR,
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
  if (relativePath === PLUGIN_UI_DIR || relativePath.startsWith(`${PLUGIN_UI_DIR}/`)) return true;
  if (relativePath.startsWith('server/') || relativePath === 'server') return false;
  if (relativePath === PLUGIN_API_DIR || relativePath.startsWith(`${PLUGIN_API_DIR}/`)) return false;
  return true;
}

export function isBackendRelativePath(relativePath: string): boolean {
  if (relativePath === 'package.json') return true;
  if (relativePath === PLUGIN_API_DIR || relativePath.startsWith(`${PLUGIN_API_DIR}/`)) return true;
  return relativePath.startsWith('server/') || relativePath === 'server';
}
