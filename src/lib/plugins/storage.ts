import fs from 'fs/promises';
import path from 'path';
import {
  UPLOADED_PLUGINS_FRONTEND_ROOT,
  assertUploadPathNotInPublic,
} from '@/lib/dynamicContent';
import { getNestedPackageSegment } from '@/lib/plugins/pluginLayout';

/** Plugin frontend storage root — under `src/plugins/`, never `public/`. */
export const PLUGINS_FRONTEND_DIR = process.env.PLUGINS_FRONTEND_DIR
  ? path.resolve(process.env.PLUGINS_FRONTEND_DIR)
  : UPLOADED_PLUGINS_FRONTEND_ROOT;

/** @deprecated Use PLUGINS_FRONTEND_DIR — uploads are not stored in public/. */
export const PLUGINS_PUBLIC_DIR = PLUGINS_FRONTEND_DIR;

/**
 * Fallback defaults only. Live limits come from Settings.config via
 * `getMaxPluginZipBytes()` / `getMaxPluginFiles()` in uploadLimits.ts.
 */
export const MAX_PLUGIN_ZIP_BYTES = 100 * 1024 * 1024;
export const MAX_PLUGIN_FILES = 1000;

function resolveFrontendRoot(): string {
  const root = PLUGINS_FRONTEND_DIR;
  assertUploadPathNotInPublic(root, 'PLUGINS_FRONTEND_DIR');
  return root;
}

/** Installed frontend package: `src/plugins/{pluginId}/{pluginId}/` */
export function getPluginDirectory(pluginId: string): string {
  const dir = path.join(resolveFrontendRoot(), pluginId, getNestedPackageSegment(pluginId));
  assertUploadPathNotInPublic(dir, 'Plugin package directory');
  return dir;
}

/** Public URL base — served via `/plugins/[pluginId]/[...file]` route, not static public/ files. */
export function getPluginPublicBase(pluginId: string): string {
  return `/plugins/${pluginId}`;
}

export function toPublicPluginPath(pluginId: string, relativePath: string): string {
  return `${getPluginPublicBase(pluginId)}/${relativePath.replace(/\\/g, '/')}`;
}

export async function ensurePluginsDirectory(): Promise<void> {
  await fs.mkdir(resolveFrontendRoot(), { recursive: true });
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
  const pluginOuterDir = path.join(resolveFrontendRoot(), pluginId);
  try {
    await fs.rm(pluginOuterDir, { recursive: true, force: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }
}
