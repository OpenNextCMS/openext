import path from 'path';
import { ApiError } from '@/lib/api/errors';
import type { ParsedThemePackage } from '../types';
import {
  ensureThemesStorage,
  getThemeDirectory,
  getThemePublicBase,
  removeThemeDirectory,
  writeThemeFile,
} from '../utils/storage';
import { ThemeRepository } from '../repositories/ThemeRepository';
import type { ITheme } from '@/types/theme';

/**
 * Writes extracted package files to storage/themes/{slug} and builds public URLs
 * under /theme-assets/{slug}/… (served by the asset route — never raw FS paths).
 */
export const ThemeImporter = {
  async persistAssets(pkg: ParsedThemePackage): Promise<{
    assetsPath: string;
    previewImage: string;
    thumbnail: string;
  }> {
    const slug = pkg.meta.slug;
    await ensureThemesStorage();
    await removeThemeDirectory(slug);
    await writeThemeFile(slug, '.keep', '');

    for (const entry of pkg.assetEntries) {
      const buf = await entry.getBuffer();
      await writeThemeFile(slug, entry.relativePath, buf);
    }

    let previewImage = '';
    let thumbnail = '';

    if (pkg.previewBuffer && pkg.previewExt) {
      const rel = `preview.${pkg.previewExt}`;
      await writeThemeFile(slug, rel, pkg.previewBuffer);
      previewImage = `${getThemePublicBase(slug)}/${rel}`;
    }

    if (pkg.thumbnailBuffer && pkg.thumbnailExt) {
      const rel = `thumbnail.${pkg.thumbnailExt}`;
      await writeThemeFile(slug, rel, pkg.thumbnailBuffer);
      thumbnail = `${getThemePublicBase(slug)}/${rel}`;
    }

    // Persist token / template / layout / preset JSON onto disk for round-trip export
    for (const [group, value] of Object.entries(pkg.tokens)) {
      await writeThemeFile(
        slug,
        path.posix.join('tokens', `${group}.json`),
        JSON.stringify(value, null, 2)
      );
    }

    if (pkg.templates.header !== undefined) {
      await writeThemeFile(
        slug,
        'templates/header.json',
        JSON.stringify(pkg.templates.header, null, 2)
      );
    }
    if (pkg.templates.footer !== undefined) {
      await writeThemeFile(
        slug,
        'templates/footer.json',
        JSON.stringify(pkg.templates.footer, null, 2)
      );
    }

    for (const [name, value] of Object.entries(pkg.layouts)) {
      await writeThemeFile(
        slug,
        path.posix.join('layouts', `${name}.json`),
        JSON.stringify(value, null, 2)
      );
    }

    for (const [name, value] of Object.entries(pkg.presets.blocks)) {
      await writeThemeFile(
        slug,
        path.posix.join('blocks', `${name}.json`),
        JSON.stringify(value, null, 2)
      );
    }

    for (const [name, value] of Object.entries(pkg.presets.styles)) {
      await writeThemeFile(
        slug,
        path.posix.join('presets', `${name}.json`),
        JSON.stringify(value, null, 2)
      );
    }

    return {
      assetsPath: getThemeDirectory(slug),
      previewImage,
      thumbnail,
    };
  },

  /** Register package theme in MongoDB (inactive; installed=false until install step). */
  async registerTheme(
    pkg: ParsedThemePackage,
    persisted: { assetsPath: string; previewImage: string; thumbnail: string },
    opts: { tenantId: string; userId?: string }
  ): Promise<ITheme & { _id: string }> {
    const existing = await ThemeRepository.findBySlug(pkg.meta.slug);
    if (existing) {
      throw new ApiError(
        `A theme with slug "${pkg.meta.slug}" already exists. Delete or rename it first.`,
        409
      );
    }

    return ThemeRepository.create({
      tenantId: opts.tenantId,
      name: pkg.meta.name,
      slug: pkg.meta.slug,
      description: pkg.meta.description ?? '',
      author: pkg.meta.author ?? '',
      version: pkg.meta.version,
      packageVersion: pkg.meta.version,
      isSystemTheme: false,
      isDefault: false,
      isActive: false,
      installed: false,
      isPackageTheme: true,
      previewImage: persisted.previewImage,
      thumbnail: persisted.thumbnail,
      assetsPath: persisted.assetsPath,
      theme: pkg.theme,
      componentVariants: pkg.componentVariants,
      tokens: pkg.tokens,
      templates: pkg.templates,
      layouts: pkg.layouts,
      presets: pkg.presets,
      supports: pkg.supports,
      // Never auto-apply homepage layout just because layouts/ exists.
      // Opt in via theme.json `"applyPageLayout": true`, gallery checkbox, or Apply layout.
      applyPageLayout: pkg.meta.applyPageLayout === true,
      createdBy: opts.userId,
      meta: {
        compatibleCms: pkg.meta.compatibleCms,
        packageFormat: pkg.meta.format,
        uploadedAt: new Date().toISOString(),
      },
    });
  },
};
