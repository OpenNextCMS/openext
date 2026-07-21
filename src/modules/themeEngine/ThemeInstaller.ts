import fs from 'fs/promises';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import JSZip from 'jszip';
import type { Types } from 'mongoose';
import { themeValidator, type ThemeValidator } from './ThemeValidator';
import { themeRepository } from './repositories/ThemeRepository';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import type { IThemeEngineThemeDocument } from './models/Theme';
import { ThemeInstallError, ThemeAlreadyExistsError } from './errors';
import {
  MANIFEST_FILENAME,
  MAX_COMPRESSION_RATIO,
  MAX_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_UNPACKED_BYTES,
  MAX_UPLOAD_BYTES,
  TEMP_UPLOAD_ROOT,
  THEMES_ROOT,
} from './config';
import type { ThemeInstallLogEntry, ThemeManifest, ThemeValidationIssue } from './types';

/**
 * §4.3 ThemeInstaller — orchestrate ZIP → validated → installed-on-disk →
 * registered-in-DB.
 *
 * Flow (spec order): size-cap the upload → extract to a TEMP dir (never straight
 * into `/themes`), enforcing per-entry/total limits DURING extraction → checksum
 * the archive → `ThemeValidator.validate()` the extracted dir → on failure, clean
 * up and throw (recording a `failed` DB row only for a brand-new slug — an existing
 * install/failed-attempt row is never touched by a failed re-upload) → on success,
 * move (never copy) into `/themes/{slug}` (atomic swap when `replace` is set) →
 * persist the `themes` document → clean up the temp dir in a `finally`.
 *
 * NOTE on module ordering: the spec's §4.3 step 7 says "insert/update via
 * ThemeRegistry.register()", but ThemeRegistry (§4.4) is built in the NEXT module.
 * This installer owns its own DB write for now; once ThemeRegistry lands it
 * becomes the sole gateway and this installer is revisited to delegate to it
 * instead of writing directly (same "later module absorbs an earlier one's DB
 * write" pattern as AssetManager/§4.9 revisiting this module for `assetHashes`).
 */

export interface ThemeInstallContext {
  installedBy: Types.ObjectId | string;
  /** Upgrade an existing installation in place (atomic swap) instead of rejecting. */
  replace?: boolean;
}

interface ExtractedPackage {
  tmpDir: string;
  totalBytes: number;
}

function normalizeArchivePath(raw: string): string {
  return raw.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** JSZip stashes declared sizes on an internal field; read defensively. */
function entrySizes(entry: JSZip.JSZipObject): { uncompressed: number; compressed: number } {
  const data = (entry as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data;
  return { uncompressed: data?.uncompressedSize ?? 0, compressed: data?.compressedSize ?? 0 };
}

/** Package root = the shallowest folder containing `theme.json` (handles wrapped zips). */
function detectRootPrefix(archivePaths: string[]): string {
  const manifests = archivePaths.filter((p) => p === MANIFEST_FILENAME || p.endsWith(`/${MANIFEST_FILENAME}`));
  if (manifests.length === 0) return '';
  manifests.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length);
  const idx = manifests[0].lastIndexOf('/');
  return idx >= 0 ? manifests[0].slice(0, idx + 1) : '';
}

/** Zip-slip guard: the resolved write path must stay inside `targetDir`. */
function assertInsideTarget(targetDir: string, relativePath: string): string {
  const resolvedTarget = path.resolve(targetDir);
  const resolved = path.resolve(resolvedTarget, relativePath);
  const rel = path.relative(resolvedTarget, resolved);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ThemeInstallError(`Archive entry "${relativePath}" resolves outside the extraction target (Zip Slip).`);
  }
  return resolved;
}

export class ThemeInstaller {
  constructor(
    private readonly validator: ThemeValidator = themeValidator,
    private readonly registry: ThemeRegistry = themeRegistry
  ) {}

  async install(zipBuffer: Buffer, ctx: ThemeInstallContext): Promise<IThemeEngineThemeDocument> {
    const log: ThemeInstallLogEntry[] = [];
    const stamp = (step: string, status: ThemeInstallLogEntry['status'], message: string) => {
      log.push({ step, status, message, at: new Date() });
    };

    let tmpDir: string | null = null;
    let movedTo: string | null = null;
    let oldAsideDir: string | null = null;

    try {
      // ---- 1. size-cap the raw upload -------------------------------------
      stamp('uploading', 'ok', 'Received upload.');
      if (zipBuffer.byteLength <= 0) throw new ThemeInstallError('Uploaded file is empty.');
      if (zipBuffer.byteLength > MAX_UPLOAD_BYTES) {
        throw new ThemeInstallError(
          `Uploaded file (${(zipBuffer.byteLength / 1048576).toFixed(1)} MB) exceeds the ${(MAX_UPLOAD_BYTES / 1048576).toFixed(0)} MB limit.`
        );
      }

      // ---- 2. extract to a temp dir, enforcing limits DURING extraction ----
      stamp('extracting', 'ok', 'Extracting archive...');
      const extracted = await this.extract(zipBuffer);
      tmpDir = extracted.tmpDir;

      // ---- 3. checksum the archive (sha256 over the uploaded package) ------
      const checksum = createHash('sha256').update(zipBuffer).digest('hex');

      // ---- 4. validate the extracted package as a whole ---------------------
      stamp('checking-manifest', 'ok', 'Validating package...');
      const result = await this.validator.validate(tmpDir);

      if (!result.valid) {
        stamp('error', 'error', `Validation failed (${result.errors.length} error(s)).`);
        await this.recordFailure(result.manifest?.slug, ctx, checksum, [...log], result.errors);
        throw new ThemeInstallError(
          `Theme package failed validation (${result.errors.length} error(s)).`,
          result.errors
        );
      }

      const manifest = result.manifest as ThemeManifest;
      for (const w of result.warnings) stamp('checking-manifest', 'warning', `${w.file ? `${w.file}: ` : ''}${w.message}`);

      // ---- existing-slug guard (reject unless an upgrade was requested) -----
      const existing = await this.registry.getBySlug(manifest.slug);
      if (existing && existing.status === 'installed' && !ctx.replace) {
        throw new ThemeAlreadyExistsError(manifest.slug);
      }

      // ---- 6. move (never copy) into /themes/{slug}, atomic swap on upgrade --
      stamp('installing', 'ok', 'Installing package...');
      await fs.mkdir(THEMES_ROOT, { recursive: true });
      const destDir = path.join(THEMES_ROOT, manifest.slug);

      const destExists = await fs
        .stat(destDir)
        .then((st) => st.isDirectory())
        .catch(() => false);

      if (destExists) {
        if (!ctx.replace) throw new ThemeAlreadyExistsError(manifest.slug);
        oldAsideDir = `${destDir}.replaced-${randomUUID()}`;
        await fs.rename(destDir, oldAsideDir);
      }

      await fs.rename(tmpDir, destDir);
      movedTo = destDir;
      tmpDir = null; // ownership transferred to the permanent install path

      // ---- 6b. content-hash style.css/theme.js ONCE, at install time (spec §4.9) --
      const assetHashes = await this.hashAssets(destDir);

      // ---- 7. persist the `themes` document (via ThemeRegistry, spec §4.3 step 7) --
      stamp('success', 'ok', 'Installed successfully.');
      const doc = await this.registry.register(
        manifest,
        path.posix.join('themes', manifest.slug),
        checksum,
        ctx.installedBy,
        log,
        assetHashes
      );

      // Upgrade succeeded — the aside copy of the old install is no longer needed.
      if (oldAsideDir) await removeIfExists(oldAsideDir);

      return doc;
    } catch (err) {
      // Roll back any partial filesystem state so a failed install leaves nothing.
      if (tmpDir) await removeIfExists(tmpDir);
      if (movedTo && oldAsideDir) {
        // The swap's second rename failed after the old dir was moved aside —
        // best-effort restore so a failed upgrade doesn't destroy the old install.
        await removeIfExists(movedTo);
        await fs.rename(oldAsideDir, movedTo).catch(() => undefined);
      } else if (movedTo && !oldAsideDir) {
        await removeIfExists(movedTo);
      }
      throw err;
    }
  }

  /** Extract a validated-size ZIP to a fresh temp dir, enforcing caps per-entry as we go. */
  private async extract(buffer: Buffer): Promise<ExtractedPackage> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new ThemeInstallError('The uploaded file is not a valid ZIP archive.');
    }

    const rawEntries = Object.values(zip.files).filter((f) => !f.dir);
    if (rawEntries.length === 0) throw new ThemeInstallError('The archive contains no files.');
    if (rawEntries.length > MAX_ENTRIES) {
      throw new ThemeInstallError(`Archive has too many entries (>${MAX_ENTRIES}) — possible zip bomb.`);
    }

    const archivePaths = rawEntries.map((e) => normalizeArchivePath(e.name));
    const rootPrefix = detectRootPrefix(archivePaths);

    const tmpDir = path.join(TEMP_UPLOAD_ROOT, `extract-${randomUUID()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    let totalBytes = 0;
    try {
      for (const entry of rawEntries) {
        const archivePath = normalizeArchivePath(entry.name);
        if (!archivePath || archivePath.includes('\0')) {
          throw new ThemeInstallError(`Archive contains an invalid entry path: "${entry.name}".`);
        }
        if (archivePath.split('/').some((s) => s === '..')) {
          throw new ThemeInstallError(`Archive entry "${archivePath}" attempts directory traversal (Zip Slip).`);
        }

        const { uncompressed, compressed } = entrySizes(entry);
        if (uncompressed > MAX_ENTRY_BYTES) {
          throw new ThemeInstallError(`Archive entry "${archivePath}" is too large (a single file exceeds the per-file limit).`);
        }
        if (compressed > 0 && uncompressed / compressed > MAX_COMPRESSION_RATIO) {
          throw new ThemeInstallError(`Archive entry "${archivePath}" has a suspicious compression ratio — possible zip bomb.`);
        }
        totalBytes += uncompressed;
        if (totalBytes > MAX_UNPACKED_BYTES) {
          throw new ThemeInstallError(`Archive's decompressed size exceeds the ${(MAX_UNPACKED_BYTES / 1048576).toFixed(0)} MB limit — possible zip bomb.`);
        }

        // Strip the wrapping folder (if any) so paths land package-relative.
        if (rootPrefix && !archivePath.startsWith(rootPrefix)) continue;
        const relativePath = rootPrefix ? archivePath.slice(rootPrefix.length) : archivePath;
        if (!relativePath) continue;

        const targetPath = assertInsideTarget(tmpDir, relativePath);
        const content = await entry.async('nodebuffer');
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
      }
    } catch (err) {
      await removeIfExists(tmpDir);
      throw err;
    }

    return { tmpDir, totalBytes };
  }

  /** On validation failure, record a `failed` row ONLY for a brand-new slug. */
  private async recordFailure(
    slug: string | undefined,
    ctx: ThemeInstallContext,
    checksum: string,
    log: ThemeInstallLogEntry[],
    errors: ThemeValidationIssue[]
  ): Promise<void> {
    if (!slug) return; // manifest never parsed far enough to know a slug — nothing to key a row on.
    try {
      await themeRepository.upsertFailedIfNew({
        slug,
        checksum,
        installedBy: ctx.installedBy,
        installLog: [
          ...log,
          {
            step: 'validation',
            status: 'error',
            message: errors.map((e) => `${e.file ? `${e.file}: ` : ''}${e.message}`).join('; '),
            at: new Date(),
          },
        ],
      });
    } catch {
      // Best-effort only — a failed install must still throw ThemeInstallError
      // even if this bookkeeping write itself fails.
    }
  }

  /**
   * Content-hash `assets/style.css` and `assets/theme.js` ONCE, right after the
   * install move (spec §4.9 — `AssetManager` never re-hashes per request).
   * Both files are optional; a missing one just leaves that hash undefined.
   */
  private async hashAssets(destDir: string): Promise<{ stylesheet?: string; script?: string }> {
    const hashes: { stylesheet?: string; script?: string } = {};
    const targets: [key: 'stylesheet' | 'script', rel: string][] = [
      ['stylesheet', path.join('assets', 'style.css')],
      ['script', path.join('assets', 'theme.js')],
    ];
    for (const [key, rel] of targets) {
      try {
        const content = await fs.readFile(path.join(destDir, rel));
        hashes[key] = createHash('sha256').update(content).digest('hex');
      } catch {
        // File doesn't exist — this theme simply has no stylesheet/script.
      }
    }
    return hashes;
  }
}

async function removeIfExists(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** Convenience singleton. */
export const themeInstaller = new ThemeInstaller();
