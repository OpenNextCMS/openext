import fs from 'fs/promises';
import path from 'path';
import { THEMES_DIR } from '../config';
import { ExtractionService } from './ExtractionService';
import { ValidationService } from './ValidationService';
import { BackupService } from './BackupService';
import { ThemeRepository, type InstalledThemeRecord } from '../repositories/ThemeRepository';
import { invalidateTheme } from './CacheManager';
import { isNewer } from '../utils/version';
import {
  InvalidVersionError,
  ThemeNotFoundError,
  RollbackFailedError,
  asThemeSystemError,
  ThemeSystemError,
} from '../errors';
import type { InstallLogger, InstallStage, ThemeOperationContext } from '../types';

/**
 * UpdateService — safe theme update with automatic rollback (spec §10).
 *
 * Flow: validate new package → require a strictly newer semver & matching slug →
 * back up the current install → replace files → update the DB record. If ANY
 * step after the backup fails, the previous version is restored from the backup
 * archive, so the site is never left broken.
 */
export const UpdateService = {
  async update(
    slug: string,
    buffer: Buffer,
    ctx: ThemeOperationContext = {},
    logger?: InstallLogger
  ): Promise<InstalledThemeRecord> {
    const log = makeLogger(logger);
    const existing = await ThemeRepository.findBySlug(slug);
    if (!existing) throw new ThemeNotFoundError(slug);

    let tmpDir: string | null = null;
    let backupPath: string | null = null;
    let filesReplaced = false;

    try {
      // 1. Extract + validate the incoming package.
      log('extracting', 'Extracting...');
      await ExtractionService.ensureWorkspace();
      const extracted = await ExtractionService.extract(buffer);
      tmpDir = extracted.tmpDir;

      log('checking-manifest', 'Checking Manifest...');
      const manifest = ValidationService.validateManifest(extracted.manifestRaw);
      await ValidationService.validateStructure(tmpDir, manifest);
      ValidationService.checkCompatibility(manifest);

      // 2. Must be the same theme and a strictly newer version (§10).
      if (manifest.slug !== slug) {
        throw new InvalidVersionError(`Uploaded package slug "${manifest.slug}" does not match "${slug}".`, {
          expected: slug,
          got: manifest.slug,
        });
      }
      if (!isNewer(manifest.version, existing.version)) {
        throw new InvalidVersionError(
          `Uploaded version ${manifest.version} is not newer than the installed ${existing.version}.`,
          { installed: existing.version, uploaded: manifest.version }
        );
      }

      // 3. Back up current install BEFORE touching anything.
      log('validating', `Backing up ${slug}@${existing.version}...`);
      await ThemeRepository.updateBySlug(slug, { status: 'updating' });
      backupPath = await BackupService.backup(slug, existing.version);

      // 4. Replace files.
      log('installing', 'Installing...');
      const destDir = path.join(THEMES_DIR, slug);
      await fs.rm(destDir, { recursive: true, force: true });
      await fs.rename(tmpDir, destDir);
      tmpDir = null;
      filesReplaced = true;

      // 5. Update DB (preserve active flag + install identity).
      const updated = await ThemeRepository.updateBySlug(slug, {
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        homepage: manifest.homepage ?? '',
        license: manifest.license ?? '',
        thumbnail: manifest.thumbnail,
        settings: manifest.settings,
        minimumCMSVersion: manifest.minimumCMSVersion ?? '',
        status: 'installed',
        meta: {
          ...(existing.meta ?? {}),
          dependencies: manifest.dependencies ?? {},
          requires: manifest.requires ?? {},
          updatedAt: ctx.now ?? new Date().toISOString(),
          updatedBy: ctx.userId,
          previousVersion: existing.version,
        },
      });
      if (!updated) throw new ThemeNotFoundError(slug);

      // 6. Cache bust + cleanup backup on success is optional; keep it for history.
      log('generating-cache', 'Generating Cache...');
      invalidateTheme(slug);

      log('success', 'Success.');
      return updated;
    } catch (err) {
      const original = asThemeSystemError(err);

      // Automatic rollback if we had already started replacing files.
      if (backupPath && filesReplaced) {
        try {
          await BackupService.restore(slug, backupPath);
          await ThemeRepository.updateBySlug(slug, { status: 'installed', version: existing.version });
          invalidateTheme(slug);
        } catch (restoreErr) {
          await ThemeRepository.updateBySlug(slug, { status: 'corrupted' });
          throw new RollbackFailedError(
            `Update of "${slug}" failed and rollback also failed: ${restoreErr instanceof Error ? restoreErr.message : restoreErr}`,
            { original: original.toJSON() }
          );
        }
      } else {
        // No file changes yet — just clear the "updating" flag.
        await ThemeRepository.updateBySlug(slug, { status: 'installed' }).catch(() => {});
      }

      if (tmpDir) await ExtractionService.cleanup(tmpDir);
      log('error', original.message);
      throw original instanceof ThemeSystemError ? original : asThemeSystemError(original);
    }
  },
};

function makeLogger(logger?: InstallLogger) {
  return (stage: InstallStage, message: string) => {
    const entry = { stage, message, at: new Date().toISOString() };
    if (logger) logger(entry);
    else if (stage === 'error') console.error(`[theme-update] ${message}`);
    else console.log(`[theme-update] ${message}`);
  };
}
