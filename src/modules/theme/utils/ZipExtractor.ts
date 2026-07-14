import JSZip from 'jszip';
import { ApiError } from '@/lib/api/errors';
import {
  MAX_THEME_EXTRACTED_BYTES,
  MAX_THEME_PACKAGE_FILES,
  MAX_THEME_SINGLE_FILE_BYTES,
} from '../constants';
import type { ThemeZipEntry } from '../types';
import {
  hasAllowedAssetExtension,
  hasBlockedExtension,
  isSafeRelativePath,
  normalizeZipPath,
} from './pathSafety';

/**
 * Safe ZIP loader for theme packages.
 * Guards: empty archive, zip-bomb (total + per-file), zip-slip paths, executables.
 */

export interface LoadedThemeZip {
  zip: JSZip;
  /** All safe file entries with package-root-relative paths. */
  entries: ThemeZipEntry[];
  /** Detected single-root folder prefix (e.g. "business-theme/"), or "". */
  rootPrefix: string;
}

function uncompressedSize(entry: JSZip.JSZipObject): number {
  return (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
}

/**
 * Package root = directory that contains theme.json (shortest path wins).
 * Handles flat zips, single wrappers (`business-theme/theme.json`), and deeper
 * nests (`examples/meridian-theme/theme.json`) so layouts/templates stay at
 * package-relative paths like `layouts/default.json`.
 */
function detectRootPrefix(paths: string[]): string {
  const normalized = paths.map(normalizeZipPath).filter(Boolean);
  if (normalized.length === 0) return '';

  const themeJsonPaths = normalized.filter(
    (p) => p === 'theme.json' || p.endsWith('/theme.json')
  );

  if (themeJsonPaths.length > 0) {
    themeJsonPaths.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length);
    const themeJson = themeJsonPaths[0];
    const slash = themeJson.lastIndexOf('/');
    return slash >= 0 ? themeJson.slice(0, slash + 1) : '';
  }

  // Fallback for token-only packages that ship tokens/ without theme.json name clash
  const topLevels = new Set(normalized.map((p) => p.split('/')[0]));
  if (topLevels.size !== 1) return '';
  const prefix = `${[...topLevels][0]}/`;
  const hasNested = normalized.some((p) => p.includes('/'));
  if (!hasNested) return '';
  if (normalized.some((p) => p.startsWith(`${prefix}tokens/`))) return prefix;
  return '';
}

export async function loadThemeZip(data: ArrayBuffer): Promise<LoadedThemeZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new ApiError('Could not read the ZIP file — is it a valid archive?', 400);
  }

  const rawEntries = Object.entries(zip.files).filter(([, f]) => !f.dir);
  if (rawEntries.length === 0) {
    throw new ApiError('The theme ZIP is empty.', 400);
  }
  if (rawEntries.length > MAX_THEME_PACKAGE_FILES) {
    throw new ApiError(
      `Theme package exceeds the ${MAX_THEME_PACKAGE_FILES} file limit.`,
      413
    );
  }

  let totalBytes = 0;
  for (const [, entry] of rawEntries) {
    const size = uncompressedSize(entry);
    totalBytes += size;
    if (size > MAX_THEME_SINGLE_FILE_BYTES) {
      throw new ApiError('A file inside the theme package is too large.', 413);
    }
  }
  if (totalBytes > MAX_THEME_EXTRACTED_BYTES) {
    throw new ApiError('The theme package contents are too large (possible zip bomb).', 413);
  }

  const allPaths = rawEntries.map(([p]) => normalizeZipPath(p));
  const rootPrefix = detectRootPrefix(allPaths);

  const entries: ThemeZipEntry[] = [];

  for (const [filePath, zipEntry] of rawEntries) {
    const normalized = normalizeZipPath(filePath);
    if (!normalized.startsWith(rootPrefix) && rootPrefix) continue;

    const relativePath = rootPrefix ? normalized.slice(rootPrefix.length) : normalized;
    if (!relativePath) continue;

    // Zip-slip protection
    if (!isSafeRelativePath(relativePath)) {
      throw new ApiError(`Unsafe path in theme package: "${relativePath}"`, 400);
    }

    const lower = relativePath.toLowerCase();
    const base = lower.split('/').pop() || lower;

    // Skip VCS / OS placeholders — common in example packages, never needed at runtime
    if (
      base === '.gitkeep' ||
      base === '.ds_store' ||
      base === 'thumbs.db' ||
      base === 'desktop.ini' ||
      base.startsWith('._')
    ) {
      continue;
    }

    if (hasBlockedExtension(relativePath)) {
      throw new ApiError(
        `Executable or blocked file type is not allowed in theme packages: "${relativePath}"`,
        400
      );
    }

    // Non-JSON package files must be known asset types (JSON is always allowed for tokens/templates).
    const isJson = lower.endsWith('.json');
    const isRootPreview =
      /^preview\.(png|jpe?g|webp|gif|svg)$/i.test(base) ||
      /^thumbnail\.(png|jpe?g|webp|gif|svg)$/i.test(base);
    const isImage =
      isRootPreview ||
      (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(lower) &&
        (lower.startsWith('assets/') ||
          lower.startsWith('images/') ||
          lower.startsWith('css/') ||
          lower.startsWith('fonts/')));

    if (!isJson && !isImage && !hasAllowedAssetExtension(relativePath)) {
      const underAssetDir =
        lower.startsWith('assets/') ||
        lower.startsWith('css/') ||
        lower.startsWith('fonts/') ||
        lower.startsWith('images/');
      if (!underAssetDir || !hasAllowedAssetExtension(relativePath)) {
        throw new ApiError(`Unsupported file type in theme package: "${relativePath}"`, 400);
      }
    }

    const size = uncompressedSize(zipEntry);
    entries.push({
      relativePath,
      size,
      getBuffer: () => zipEntry.async('nodebuffer'),
    });
  }

  if (entries.length === 0) {
    throw new ApiError('No usable files found in the theme package.', 400);
  }

  return { zip, entries, rootPrefix };
}
