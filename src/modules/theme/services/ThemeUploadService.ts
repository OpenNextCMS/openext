import { ApiError } from '@/lib/api/errors';
import { loadThemeZip } from '../utils/ZipExtractor';
import { parseThemePackage } from '../utils/ThemeParser';
import { ThemeImporter } from '../utils/ThemeImporter';
import { validateZipUpload } from '../validators/PackageValidator';
import { ThemeRepository } from '../repositories/ThemeRepository';
import type { ParsedThemePackage } from '../types';
import type { ITheme } from '@/types/theme';

/**
 * ThemeUploadService — full upload pipeline for theme ZIPs.
 *
 * Flow: validate MIME/size → load ZIP safely → parse/validate → persist assets →
 * register Theme row (inactive, not yet "installed") → caller deletes temp buffers
 * (we keep everything in memory; no temp files on disk).
 */
export const ThemeUploadService = {
  async uploadFromFile(
    file: File,
    ctx: { tenantId: string; userId?: string }
  ): Promise<ITheme & { _id: string }> {
    validateZipUpload(file);

    const arrayBuffer = await file.arrayBuffer();
    return this.uploadFromBuffer(arrayBuffer, {
      ...ctx,
      fallbackName: file.name.replace(/\.zip$/i, ''),
    });
  },

  async uploadFromBuffer(
    data: ArrayBuffer,
    ctx: { tenantId: string; userId?: string; fallbackName?: string }
  ): Promise<ITheme & { _id: string }> {
    const zip = await loadThemeZip(data);
    const pkg = await parseThemePackage(zip, { fallbackName: ctx.fallbackName });

    // Duplicate slug check before writing anything to disk
    if (await ThemeRepository.existsBySlug(pkg.meta.slug)) {
      throw new ApiError(
        `A theme with slug "${pkg.meta.slug}" already exists. Delete or rename it first.`,
        409
      );
    }

    const persisted = await ThemeImporter.persistAssets(pkg);
    try {
      return await ThemeImporter.registerTheme(pkg, persisted, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      });
    } catch (err) {
      // Roll back extracted files if DB registration fails
      const { removeThemeDirectory } = await import('../utils/storage');
      await removeThemeDirectory(pkg.meta.slug);
      throw err;
    }
  },

  /** Parse-only (no persistence) — useful for dry-run / preview. */
  async parseOnly(data: ArrayBuffer, fallbackName?: string): Promise<ParsedThemePackage> {
    const zip = await loadThemeZip(data);
    return parseThemePackage(zip, { fallbackName });
  },
};
