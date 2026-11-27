import path from 'node:path';
import JSZip from 'jszip';
import { hasBlockedExtension, isSafeRelativePath } from '@/lib/plugins/manifest';
import { BLOCKED_PLUGIN_PATH_SEGMENTS } from '@/lib/plugins/server/storage';
import { sha256 } from '@/lib/extensions/checksum';
import {
  ALLOWED_EXTENSION_ROOTS,
  ALLOWED_FILE_EXTENSIONS,
} from '@/lib/extensions/constants';
import type { ExtensionDiagnostic } from '@/lib/extensions/errors';
import type { ExtensionLimits } from '@/lib/extensions/types';

export interface ArchiveInspection {
  ok: boolean;
  checksum: string;
  fileCount: number;
  extractedBytes: number;
  entries: Map<string, Buffer>;
  errors: ExtensionDiagnostic[];
  warnings: ExtensionDiagnostic[];
}

function declaredUncompressedSize(entry: JSZip.JSZipObject): number | null {
  const internal = entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
  const size = internal._data?.uncompressedSize;
  return typeof size === 'number' ? size : null;
}

function isSymlink(entry: JSZip.JSZipObject): boolean {
  const mode = entry.unixPermissions;
  if (typeof mode !== 'number') return false;
  return (mode & 0o170000) === 0o120000;
}

export function assertArchiveEntryName(name: string): string | null {
  if (!name || name.includes('\0')) return 'Archive entry name is empty or contains a null byte.';
  if (name.startsWith('/') || name.startsWith('\\')) return `Absolute path "${name}" is not allowed.`;
  if (/^[a-zA-Z]:/.test(name)) return `Absolute path "${name}" is not allowed.`;
  const normalized = name.replace(/\\/g, '/');
  if (normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    return `Path "${name}" is not a safe relative path.`;
  }
  return null;
}

function rootSegment(relativePath: string): string {
  return relativePath.split('/')[0] || '';
}

function isAllowedPackageFile(relativePath: string): boolean {
  if (relativePath === 'manifest.json' || relativePath === 'README.md') return true;
  const root = rootSegment(relativePath);
  if (!ALLOWED_EXTENSION_ROOTS.has(root)) return false;
  const ext = path.posix.extname(relativePath).toLowerCase();
  if (!ext || !ALLOWED_FILE_EXTENSIONS.has(ext)) return false;
  if (hasBlockedExtension(relativePath)) return false;
  return isSafeRelativePath(relativePath);
}

function locatePackageRoot(paths: string[]): { prefix: string; error?: string } {
  const manifests = paths.filter((filePath) => filePath === 'manifest.json' || filePath.endsWith('/manifest.json'));
  if (manifests.length === 0) return { prefix: '', error: 'manifest.json was not found in the extension package.' };
  if (manifests.length > 1) {
    return { prefix: '', error: 'The extension package must contain exactly one manifest.json.' };
  }
  const manifestPath = manifests[0];
  const prefix = manifestPath === 'manifest.json' ? '' : manifestPath.slice(0, -'manifest.json'.length);
  if (prefix && prefix.split('/').filter(Boolean).length !== 1) {
    return { prefix: '', error: 'manifest.json must sit at the archive root or inside a single wrapper folder.' };
  }
  for (const filePath of paths) {
    if (prefix && !filePath.startsWith(prefix)) {
      return { prefix: '', error: `File "${filePath}" is outside the extension package root.` };
    }
  }
  return { prefix };
}

export async function inspectExtensionArchive(
  bytes: Buffer,
  limits: ExtensionLimits
): Promise<ArchiveInspection> {
  const checksum = sha256(bytes);
  const errors: ExtensionDiagnostic[] = [];
  const warnings: ExtensionDiagnostic[] = [];
  const entries = new Map<string, Buffer>();

  if (bytes.length === 0) {
    errors.push({ code: 'invalid_package', message: 'The uploaded file is empty.' });
    return { ok: false, checksum, fileCount: 0, extractedBytes: 0, entries, errors, warnings };
  }

  if (bytes.length > limits.maxZipBytes) {
    errors.push({
      code: 'oversized_package',
      message: `Extension package exceeds the ${Math.floor(limits.maxZipBytes / (1024 * 1024))}MB compressed limit.`,
    });
    return { ok: false, checksum, fileCount: 0, extractedBytes: 0, entries, errors, warnings };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    errors.push({ code: 'invalid_zip', message: 'The uploaded file is not a valid ZIP archive.' });
    return { ok: false, checksum, fileCount: 0, extractedBytes: 0, entries, errors, warnings };
  }

  const files = Object.values(zip.files).filter((entry) => !entry.dir);
  if (files.length === 0) {
    errors.push({ code: 'empty_package', message: 'The extension package does not contain any files.' });
    return { ok: false, checksum, fileCount: 0, extractedBytes: 0, entries, errors, warnings };
  }

  if (files.length > limits.maxFiles) {
    errors.push({
      code: 'file_count',
      message: `Extension package exceeds the ${limits.maxFiles} file limit.`,
    });
    return { ok: false, checksum, fileCount: files.length, extractedBytes: 0, entries, errors, warnings };
  }

  const rawNames: string[] = [];
  let declaredTotal = 0;
  for (const entry of files) {
    const nameError = assertArchiveEntryName(entry.name);
    if (nameError) {
      errors.push({ code: 'unsafe_path', message: nameError, path: entry.name });
      continue;
    }
    if (isSymlink(entry)) {
      errors.push({
        code: 'unsafe_symlink',
        message: `Symbolic link "${entry.name}" is not allowed.`,
        path: entry.name,
      });
      continue;
    }
    const size = declaredUncompressedSize(entry);
    if (size != null) {
      if (size > limits.maxFileBytes) {
        errors.push({
          code: 'oversized_file',
          message: `File "${entry.name}" exceeds the per-file size limit.`,
          path: entry.name,
        });
        continue;
      }
      declaredTotal += size;
      if (declaredTotal > limits.maxExtractedBytes) {
        errors.push({
          code: 'oversized_package',
          message: 'Extracted extension package exceeds the uncompressed size limit.',
        });
        break;
      }
    }
    rawNames.push(entry.name.replace(/\\/g, '/').replace(/^\/+/, ''));
  }

  if (errors.length > 0) {
    return { ok: false, checksum, fileCount: files.length, extractedBytes: 0, entries, errors, warnings };
  }

  const located = locatePackageRoot(rawNames);
  if (located.error) {
    errors.push({ code: 'invalid_package', message: located.error });
    return { ok: false, checksum, fileCount: files.length, extractedBytes: 0, entries, errors, warnings };
  }

  let extractedBytes = 0;
  const seen = new Set<string>();

  for (const entry of files) {
    const normalized = entry.name.replace(/\\/g, '/').replace(/^\/+/, '');
    const relativePath = located.prefix ? normalized.slice(located.prefix.length) : normalized;
    if (!relativePath || !isSafeRelativePath(relativePath)) {
      errors.push({ code: 'unsafe_path', message: `Path "${entry.name}" is not allowed.`, path: entry.name });
      continue;
    }

    const segments = relativePath.split('/');
    if (segments.some((segment) => BLOCKED_PLUGIN_PATH_SEGMENTS.has(segment))) {
      errors.push({
        code: 'blocked_path',
        message: `Path "${relativePath}" contains a blocked segment.`,
        path: relativePath,
      });
      continue;
    }

    if (!isAllowedPackageFile(relativePath)) {
      errors.push({
        code: 'unsupported_file',
        message: `File "${relativePath}" is not an allowed extension package path or file type.`,
        path: relativePath,
      });
      continue;
    }

    const collisionKey = relativePath.toLowerCase();
    if (seen.has(collisionKey)) {
      errors.push({
        code: 'conflicting_path',
        message: `Conflicting path "${relativePath}" appears more than once.`,
        path: relativePath,
      });
      continue;
    }
    seen.add(collisionKey);

    const content = await entry.async('nodebuffer');
    extractedBytes += content.length;
    if (content.length > limits.maxFileBytes || extractedBytes > limits.maxExtractedBytes) {
      errors.push({
        code: 'oversized_package',
        message: 'Extracted extension package exceeds the size limit.',
        path: relativePath,
      });
      break;
    }
    entries.set(relativePath, content);
  }

  return {
    ok: errors.length === 0,
    checksum,
    fileCount: files.length,
    extractedBytes,
    entries: errors.length === 0 ? entries : new Map(),
    errors,
    warnings,
  };
}
