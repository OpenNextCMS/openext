import fs from 'fs/promises';
import path from 'path';
import { THEME_ASSETS_PUBLIC_PREFIX } from '../constants';

/**
 * Theme packages are stored outside `public/` and served only through the
 * `/theme-assets/:theme/*` route — filesystem paths are never exposed to clients.
 */
export const THEMES_STORAGE_DIR = path.join(process.cwd(), 'storage', 'themes');

export function getThemeDirectory(slug: string): string {
  return path.join(THEMES_STORAGE_DIR, slug);
}

export function getThemeAssetsDirectory(slug: string): string {
  return path.join(getThemeDirectory(slug), 'assets');
}

export function getThemePublicBase(slug: string): string {
  return `${THEME_ASSETS_PUBLIC_PREFIX}/${slug}`;
}

export async function ensureThemesStorage(): Promise<void> {
  await fs.mkdir(THEMES_STORAGE_DIR, { recursive: true });
}

export async function themeDirectoryExists(slug: string): Promise<boolean> {
  try {
    const stats = await fs.stat(getThemeDirectory(slug));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function removeThemeDirectory(slug: string): Promise<void> {
  const dir = getThemeDirectory(slug);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }
}

export async function writeThemeFile(
  slug: string,
  relativePath: string,
  data: Buffer | string
): Promise<string> {
  const abs = path.join(getThemeDirectory(slug), relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  return abs;
}
