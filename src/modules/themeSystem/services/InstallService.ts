import fs from 'fs/promises';
import path from 'path';
import { THEMES_DIR } from '../config';
import { ExtractionService } from './ExtractionService';
import { ValidationService } from './ValidationService';
import { ZipGuard } from '../security/ZipGuard';
import { ThemeRepository, type InstalledThemeRecord } from '../repositories/ThemeRepository';
import { invalidateTheme } from './CacheManager';
import { DuplicateSlugError, ThemeAlreadyInstalledError, asThemeSystemError } from '../errors';
import type { InstallLogger, ThemeOperationContext, InstallStage } from '../types';

/**
 * InstallService — orchestrates the full staged install pipeline (spec §2).
 *
 * Steps (each emits a distinct log entry; a failure at any step throws a typed
 * error and leaves NO partial state on disk or in the DB):
 *   Uploading… → Extracting… → Checking Manifest… → Installing… → Generating Cache… → Success
 *
 * SOLID: composes single-purpose services (extraction, validation, security,
 * repository, cache) — this class only sequences them.
 */
export const InstallService = {
  async install(
    buffer: Buffer,
    ctx: ThemeOperationContext = {},
    logger?: InstallLogger
  ): Promise<InstalledThemeRecord> {
    const log = makeLogger(logger);
    let tmpDir: string | null = null;
    let movedTo: string | null = null;

    try {
      // 1. Receive + size cap.
      log('uploading', 'Uploading...');
      ZipGuard.assertUploadSize(buffer.byteLength);

      // 2. Extract (ZipGuard audits structure/MIME/zip-slip/symlink/bomb inside).
      log('extracting', 'Extracting...');
      await ExtractionService.ensureWorkspace();
      const extracted = await ExtractionService.extract(buffer);
      tmpDir = extracted.tmpDir;

      // 3. Manifest + structure + compatibility.
      log('checking-manifest', 'Checking Manifest...');
      const manifest = ValidationService.validateManifest(extracted.manifestRaw);
      await ValidationService.validateStructure(tmpDir, manifest);
      ValidationService.checkCompatibility(manifest);

      // Duplicate-slug / already-installed guard (spec §4).
      const existing = await ThemeRepository.findBySlug(manifest.slug);
      if (existing) {
        if (existing.version === manifest.version) {
          throw new ThemeAlreadyInstalledError(manifest.slug, manifest.version);
        }
        throw new DuplicateSlugError(manifest.slug);
      }

      // 4. Move the extracted folder to its permanent home + persist record.
      log('installing', 'Installing...');
      const destDir = path.join(THEMES_DIR, manifest.slug);
      await fs.mkdir(THEMES_DIR, { recursive: true });
      await removeIfExists(destDir);
      await fs.rename(tmpDir, destDir);
      movedTo = destDir;
      tmpDir = null; // ownership transferred

      const record = await ThemeRepository.create({
        name: manifest.name,
        slug: manifest.slug,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        homepage: manifest.homepage ?? '',
        license: manifest.license ?? '',
        thumbnail: manifest.thumbnail,
        path: path.posix.join('themes', manifest.slug),
        status: 'installed',
        installed: true,
        active: false,
        settings: manifest.settings,
        minimumCMSVersion: manifest.minimumCMSVersion ?? '',
        meta: {
          dependencies: manifest.dependencies ?? {},
          requires: manifest.requires ?? {},
          installedAt: ctx.now ?? new Date().toISOString(),
          installedBy: ctx.userId,
        },
      });

      // 5. Warm/clear caches for this slug.
      log('generating-cache', 'Generating Cache...');
      invalidateTheme(manifest.slug);

      // 6. Done.
      log('success', 'Success.');
      return record;
    } catch (err) {
      // Roll back any partial filesystem state so a failed install leaves nothing.
      if (tmpDir) await ExtractionService.cleanup(tmpDir);
      if (movedTo) await removeIfExists(movedTo);
      const e = asThemeSystemError(err);
      log('error', e.message);
      throw e;
    }
  },
};

function makeLogger(logger?: InstallLogger) {
  return (stage: InstallStage, message: string) => {
    const entry = { stage, message, at: new Date().toISOString() };
    if (logger) logger(entry);
    else if (stage === 'error') console.error(`[theme-install] ${message}`);
    else console.log(`[theme-install] ${message}`);
  };
}

async function removeIfExists(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
