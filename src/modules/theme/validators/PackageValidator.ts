import { ApiError } from '@/lib/api/errors';
import { CMS_THEME_API_VERSION, THEME_ZIP_MIME_TYPES, MAX_THEME_PACKAGE_BYTES } from '../constants';
import { satisfiesSemver } from '../utils/semver';
import type { ThemePackageMeta } from '../types';

/**
 * Cross-cutting package validation: MIME, size, CMS compatibility, structure flags.
 */

export function validateZipUpload(file: File): void {
  if (!(file instanceof File)) {
    throw new ApiError('No file uploaded.', 400);
  }

  if (file.size <= 0) {
    throw new ApiError('Uploaded file is empty.', 400);
  }

  if (file.size > MAX_THEME_PACKAGE_BYTES) {
    throw new ApiError(
      `Theme ZIP exceeds the ${Math.round(MAX_THEME_PACKAGE_BYTES / (1024 * 1024))} MB limit.`,
      413
    );
  }

  const nameOk = /\.zip$/i.test(file.name);
  const type = (file.type || '').toLowerCase();
  const mimeOk = !type || THEME_ZIP_MIME_TYPES.has(type) || type.includes('zip');

  if (!nameOk && !mimeOk) {
    throw new ApiError('Theme package must be a .zip file.', 400);
  }
}

export function validateCmsCompatibility(meta: ThemePackageMeta): void {
  const range = meta.compatibleCms?.trim();
  if (!range) return;

  if (!satisfiesSemver(CMS_THEME_API_VERSION, range)) {
    throw new ApiError(
      `Theme requires CMS ${range}, but this installation provides ${CMS_THEME_API_VERSION}.`,
      400
    );
  }
}

/** Ensure the package looks like a theme (has theme.json + tokens or inline theme). */
export function assertPackageStructure(paths: string[]): void {
  const lower = paths.map((p) => p.toLowerCase());
  const hasThemeJson = lower.some((p) => p === 'theme.json' || p.endsWith('/theme.json'));
  if (!hasThemeJson) {
    throw new ApiError('Invalid theme package: theme.json is required at the package root.', 400);
  }

  const hasTokensDir = lower.some((p) => p.startsWith('tokens/'));
  const hasLegacyTokens = false; // checked after parsing
  void hasTokensDir;
  void hasLegacyTokens;
}

export function assertHasDesignTokens(opts: {
  hasTokenFiles: boolean;
  hasInlineTheme: boolean;
}): void {
  if (!opts.hasTokenFiles && !opts.hasInlineTheme) {
    throw new ApiError(
      'Invalid theme package: provide tokens/ (colors, typography, …) or an inline theme config in theme.json.',
      400
    );
  }
}
