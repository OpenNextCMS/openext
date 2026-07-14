import fs from 'fs/promises';
import path from 'path';
import { ApiError } from '@/lib/api/errors';
import { getThemeDirectory } from '../utils/storage';
import { hasBlockedExtension, isPathInside, isSafeRelativePath } from '../utils/pathSafety';
import type { ThemeAssetServeResult } from '../types';

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * ThemeAssetService — safely read a file from storage/themes/{slug}.
 */
export const ThemeAssetService = {
  async readAsset(slug: string, relativePath: string): Promise<ThemeAssetServeResult> {
    if (!slug || !/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
      throw new ApiError('Invalid theme slug', 400);
    }
    if (!isSafeRelativePath(relativePath) || hasBlockedExtension(relativePath)) {
      throw new ApiError('Invalid theme asset path', 400);
    }

    const themeRoot = getThemeDirectory(slug);
    const assetPath = path.join(themeRoot, relativePath);

    if (!isPathInside(themeRoot, assetPath)) {
      throw new ApiError('Invalid theme asset path', 400);
    }

    try {
      const buffer = await fs.readFile(assetPath);
      const ext = path.extname(assetPath).toLowerCase();
      return {
        buffer,
        contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
        cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
      };
    } catch {
      throw new ApiError('Theme asset not found', 404);
    }
  },

  /** List CSS files under css/ and assets/ for injection into SiteThemeProvider. */
  async listStylesheets(slug: string): Promise<string[]> {
    const urls: string[] = [];
    for (const dir of ['css', 'assets']) {
      try {
        const abs = path.join(getThemeDirectory(slug), dir);
        const files = await fs.readdir(abs);
        for (const f of files) {
          if (f.toLowerCase().endsWith('.css')) {
            urls.push(`/theme-assets/${slug}/${dir}/${f}`);
          }
        }
      } catch {
        // directory missing — fine
      }
    }
    return urls;
  },
};
