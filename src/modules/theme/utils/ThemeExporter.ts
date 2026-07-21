import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { ApiError } from '@/lib/api/errors';
import {
  THEME_PACKAGE_FORMAT,
  THEME_PACKAGE_FORMAT_VERSION,
} from '../constants';
import { getThemeDirectory } from './storage';
import { isPathInside, isSafeRelativePath } from './pathSafety';
import type { ITheme } from '@/types/theme';

/**
 * Rebuild a shareable theme ZIP from the current Theme document + on-disk assets.
 * Theme Builder edits live in MongoDB (`theme` / `tokens`) and are always exported.
 */

async function addJson(zip: JSZip, relativePath: string, data: unknown): Promise<void> {
  zip.file(relativePath, JSON.stringify(data, null, 2));
}

async function addDirectoryRecursive(
  zip: JSZip,
  absDir: string,
  zipPrefix: string,
  themeRoot: string
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(absDir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name === '.keep') continue;
    const abs = path.join(absDir, name);
    if (!isPathInside(themeRoot, abs)) continue;
    const stat = await fs.stat(abs);
    const rel = path.posix.join(zipPrefix, name.replace(/\\/g, '/'));
    if (!isSafeRelativePath(rel)) continue;

    if (stat.isDirectory()) {
      await addDirectoryRecursive(zip, abs, rel, themeRoot);
    } else {
      // Skip token/template JSON we rewrite from DB to avoid stale duplicates at wrong paths
      if (
        rel.startsWith('tokens/') ||
        rel.startsWith('templates/') ||
        rel.startsWith('layouts/') ||
        rel.startsWith('blocks/') ||
        rel.startsWith('presets/') ||
        rel === 'theme.json'
      ) {
        continue;
      }
      const buf = await fs.readFile(abs);
      zip.file(rel, buf);
    }
  }
}

export async function exportThemeToZipBuffer(theme: ITheme & { _id: string }): Promise<Buffer> {
  if (theme.isSystemTheme) {
    // System themes can still be exported as a portable token package.
  }

  const zip = new JSZip();
  const root = theme.slug;

  const themeJson = {
    format: THEME_PACKAGE_FORMAT,
    packageVersion: THEME_PACKAGE_FORMAT_VERSION,
    name: theme.name,
    slug: theme.slug,
    version: theme.packageVersion || theme.version || '1.0.0',
    author: theme.author || undefined,
    description: theme.description || undefined,
    preview: 'preview.png',
    thumbnail: 'thumbnail.jpg',
    compatibleCms: (theme.meta?.compatibleCms as string) || '^1.0.0',
    supports: theme.supports || [],
    componentVariants: theme.componentVariants || {},
  };

  await addJson(zip, `${root}/theme.json`, themeJson);

  // Tokens from DB (Theme Builder source of truth)
  const tokenSource =
    theme.tokens && Object.keys(theme.tokens).length > 0
      ? theme.tokens
      : {
          colors: theme.theme?.colors,
          typography: theme.theme?.typography,
          spacing: theme.theme?.spacing,
          radius: theme.theme?.radius,
          shadows: theme.theme?.shadows,
          layout: theme.theme?.layout,
        };

  for (const [group, value] of Object.entries(tokenSource)) {
    if (value == null) continue;
    await addJson(zip, `${root}/tokens/${group}.json`, value);
  }

  if (theme.templates?.header !== undefined) {
    await addJson(zip, `${root}/templates/header.json`, theme.templates.header);
  }
  if (theme.templates?.footer !== undefined) {
    await addJson(zip, `${root}/templates/footer.json`, theme.templates.footer);
  }

  if (theme.layouts) {
    for (const [name, value] of Object.entries(theme.layouts)) {
      await addJson(zip, `${root}/layouts/${name}.json`, value);
    }
  }

  if (theme.presets?.blocks) {
    for (const [name, value] of Object.entries(theme.presets.blocks)) {
      await addJson(zip, `${root}/blocks/${name}.json`, value);
    }
  }
  if (theme.presets?.styles) {
    for (const [name, value] of Object.entries(theme.presets.styles)) {
      await addJson(zip, `${root}/presets/${name}.json`, value);
    }
  }

  // On-disk assets (css, fonts, images, preview, thumbnail)
  if (theme.isPackageTheme || theme.assetsPath) {
    const themeRoot = getThemeDirectory(theme.slug);
    await addDirectoryRecursive(zip, themeRoot, root, themeRoot);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  if (!buffer.length) {
    throw new ApiError('Failed to generate theme export archive.', 500);
  }

  return buffer;
}
