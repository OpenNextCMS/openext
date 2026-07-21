import path from 'path';
import {
  ALLOWED_THEME_ASSET_EXTENSIONS,
  BLOCKED_THEME_EXTENSIONS,
  THEME_ASSETS_PUBLIC_PREFIX,
  THEME_SLUG_PATTERN,
} from '../constants';

/** Normalize archive paths to posix, strip leading slashes. */
export function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** True if the relative path cannot escape its root (zip-slip safe). */
export function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath.startsWith('/') || filePath.includes('\\') || filePath.includes('\0')) {
    return false;
  }
  const segments = filePath.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function hasBlockedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [...BLOCKED_THEME_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

export function hasAllowedAssetExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return false;
  return ALLOWED_THEME_ASSET_EXTENSIONS.has(ext);
}

/** Sanitize a theme slug for filesystem + URL use. */
export function sanitizeThemeSlug(value: string): string {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!sanitized) return `theme-${Date.now()}`;
  if (sanitized.length < 3) return `${sanitized}-theme`;
  return sanitized.slice(0, 64);
}

export function isValidThemeSlug(slug: string): boolean {
  return THEME_SLUG_PATTERN.test(slug);
}

/** Ensure child stays inside parent directory after resolve. */
export function isPathInside(parent: string, child: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function toPublicThemeAssetUrl(slug: string, relativePath: string): string {
  const clean = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${THEME_ASSETS_PUBLIC_PREFIX}/${slug}/${clean}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
}
