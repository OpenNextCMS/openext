import path from 'path';
import JSZip from 'jszip';
import {
  LIMITS,
  BLOCKED_EXTENSIONS,
  BLOCKED_PATH_SEGMENTS,
  BLOCKED_FILENAMES,
} from '../config';
import {
  CorruptedZipError,
  SecurityViolationError,
  UploadTooLargeError,
} from '../errors';

/**
 * ZipGuard — the dedicated security layer for theme archives (spec §5).
 *
 * Actively prevents, BEFORE anything is written to disk:
 *   • Zip Slip / path traversal (every entry must resolve inside the target dir)
 *   • Symlinks inside the archive
 *   • Executable / dangerous files (.exe .bat .dll .sh …)
 *   • Bundled node_modules / .git / .env
 *   • Zip bombs (entry count, per-entry size, total size, compression ratio caps)
 *   • Oversized uploads (100 MB)
 *
 * Stateless & pure so it can be unit-tested and reused by extraction/update.
 */

/** JSZip stashes the declared uncompressed size on an internal field; read defensively. */
function uncompressedSize(entry: JSZip.JSZipObject): number {
  return (entry as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data?.uncompressedSize ?? 0;
}
function compressedSize(entry: JSZip.JSZipObject): number {
  return (entry as unknown as { _data?: { compressedSize?: number } })._data?.compressedSize ?? 0;
}

/** POSIX-normalize an archive path and strip leading slashes. */
export function normalizeArchivePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

export const ZipGuard = {
  /** Reject before buffering the whole upload where possible (spec §5, 100 MB). */
  assertUploadSize(bytes: number): void {
    if (bytes <= 0) throw new CorruptedZipError('Uploaded file is empty.');
    if (bytes > LIMITS.MAX_UPLOAD_BYTES) throw new UploadTooLargeError(LIMITS.MAX_UPLOAD_BYTES);
  },

  /** Load a ZIP or throw a typed CorruptedZipError. */
  async load(buffer: Buffer): Promise<JSZip> {
    try {
      return await JSZip.loadAsync(buffer);
    } catch {
      throw new CorruptedZipError();
    }
  },

  /** True when a zip entry is a symlink (unix mode S_IFLNK). */
  isSymlink(entry: JSZip.JSZipObject): boolean {
    const perms = (entry as unknown as { unixPermissions?: number | null }).unixPermissions;
    if (typeof perms === 'number') return (perms & 0o170000) === 0o120000;
    return false;
  },

  /** True when any path segment is a blocked directory (node_modules/.git/.env) or filename. */
  isBlockedPath(relativePath: string): boolean {
    const segments = relativePath.toLowerCase().split('/');
    if (segments.some((s) => BLOCKED_PATH_SEGMENTS.has(s))) return true;
    const base = segments[segments.length - 1] || '';
    return BLOCKED_FILENAMES.has(base);
  },

  /** True when the file has an executable / server-script extension. */
  isBlockedExtension(relativePath: string): boolean {
    return BLOCKED_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  },

  /** Zip-slip guard: the resolved write path MUST stay inside `targetDir`. */
  assertInsideTarget(targetDir: string, relativePath: string): string {
    const resolvedTarget = path.resolve(targetDir);
    const resolved = path.resolve(resolvedTarget, relativePath);
    const rel = path.relative(resolvedTarget, resolved);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new SecurityViolationError('path traversal (Zip Slip) attempt detected.', { relativePath });
    }
    return resolved;
  },

  /**
   * Full archive audit. Runs every §5 check across all entries and returns the
   * safe, non-directory entries (paths still archive-relative). Throws on the
   * first violation.
   */
  audit(zip: JSZip): {
    entries: Array<{ archivePath: string; entry: JSZip.JSZipObject; size: number }>;
    totalBytes: number;
  } {
    const raw = Object.values(zip.files);
    const files = raw.filter((f) => !f.dir);

    if (files.length === 0) throw new CorruptedZipError('The archive contains no files.');
    if (files.length > LIMITS.MAX_ENTRIES) {
      throw new SecurityViolationError(`archive has too many entries (>${LIMITS.MAX_ENTRIES}) — possible zip bomb.`, {
        entries: files.length,
      });
    }

    let totalBytes = 0;
    const entries: Array<{ archivePath: string; entry: JSZip.JSZipObject; size: number }> = [];

    for (const entry of files) {
      const archivePath = normalizeArchivePath(entry.name);

      if (this.isSymlink(entry)) {
        throw new SecurityViolationError('symlinks are not allowed inside theme packages.', { path: archivePath });
      }
      if (!archivePath || archivePath.includes('\0')) {
        throw new SecurityViolationError('invalid entry path.', { path: entry.name });
      }
      // Zip-slip on the archive path itself (before we even choose a target).
      if (archivePath.split('/').some((s) => s === '..')) {
        throw new SecurityViolationError('path traversal (Zip Slip) attempt detected.', { path: archivePath });
      }
      if (this.isBlockedPath(archivePath)) {
        throw new SecurityViolationError('package bundles a forbidden path (node_modules/.git/.env).', { path: archivePath });
      }
      if (this.isBlockedExtension(archivePath)) {
        throw new SecurityViolationError('package contains an executable or server-script file.', { path: archivePath });
      }

      const size = uncompressedSize(entry);
      if (size > LIMITS.MAX_ENTRY_BYTES) {
        throw new SecurityViolationError('a single file inside the package is too large.', { path: archivePath, size });
      }
      const packed = compressedSize(entry);
      if (packed > 0 && size / packed > LIMITS.MAX_COMPRESSION_RATIO) {
        throw new SecurityViolationError('suspicious compression ratio — possible zip bomb.', {
          path: archivePath,
          ratio: Math.round(size / packed),
        });
      }

      totalBytes += size;
      if (totalBytes > LIMITS.MAX_EXTRACTED_BYTES) {
        throw new SecurityViolationError('decompressed size exceeds the limit — possible zip bomb.', { totalBytes });
      }

      entries.push({ archivePath, entry, size });
    }

    return { entries, totalBytes };
  },
};
