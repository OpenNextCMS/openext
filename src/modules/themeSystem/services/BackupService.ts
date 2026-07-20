import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { BACKUPS_DIR, THEMES_DIR } from '../config';
import { ZipGuard } from '../security/ZipGuard';
import { BackupFailedError, RollbackFailedError } from '../errors';

/**
 * BackupService — creates rollback archives before a theme update and restores
 * them on failure (spec §10). Archives live at
 * `/storage/backups/themes/<slug>-<version>.zip`.
 */

/** Recursively collect all files under a directory as {relativePath, absPath}. */
async function walk(dir: string, base = dir): Promise<Array<{ rel: string; abs: string }>> {
  const out: Array<{ rel: string; abs: string }> = [];
  let items: import('fs').Dirent[];
  try {
    items = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of items) {
    const abs = path.join(dir, item.name);
    if (item.isSymbolicLink()) continue; // never archive symlinks
    if (item.isDirectory()) {
      out.push(...(await walk(abs, base)));
    } else if (item.isFile()) {
      out.push({ rel: path.relative(base, abs).split(path.sep).join('/'), abs });
    }
  }
  return out;
}

export const BackupService = {
  themeDir(slug: string): string {
    return path.join(THEMES_DIR, slug);
  },

  backupPath(slug: string, version: string): string {
    return path.join(BACKUPS_DIR, `${slug}-${version}.zip`);
  },

  /** Zip the currently installed theme folder → a rollback archive. Returns its path. */
  async backup(slug: string, version: string): Promise<string> {
    const dir = this.themeDir(slug);
    try {
      await fs.access(dir);
    } catch {
      throw new BackupFailedError(`Cannot back up "${slug}": install folder not found.`, { dir });
    }

    try {
      await fs.mkdir(BACKUPS_DIR, { recursive: true });
      const zip = new JSZip();
      for (const { rel, abs } of await walk(dir)) {
        zip.file(rel, await fs.readFile(abs));
      }
      const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

      let target = this.backupPath(slug, version);
      // Never clobber an existing archive of the same version.
      if (await exists(target)) target = target.replace(/\.zip$/, `-${Date.now()}.zip`);
      await fs.writeFile(target, buf);
      return target;
    } catch (err) {
      throw new BackupFailedError(err instanceof Error ? err.message : undefined, { slug, version });
    }
  },

  /**
   * Restore a theme folder from a backup archive (used on failed update, §10).
   * Wipes the current folder and re-extracts the backup safely (Zip-Slip guarded).
   */
  async restore(slug: string, backupZipPath: string): Promise<void> {
    const dir = this.themeDir(slug);
    try {
      const buf = await fs.readFile(backupZipPath);
      const zip = await ZipGuard.load(buf);
      const { entries } = ZipGuard.audit(zip);

      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });

      for (const { archivePath, entry } of entries) {
        const target = ZipGuard.assertInsideTarget(dir, archivePath);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, await entry.async('nodebuffer'));
      }
    } catch (err) {
      throw new RollbackFailedError(err instanceof Error ? err.message : undefined, { slug, backupZipPath });
    }
  },

  async remove(backupZipPath: string): Promise<void> {
    try {
      await fs.rm(backupZipPath, { force: true });
    } catch {
      /* ignore */
    }
  },

  async list(slug: string): Promise<string[]> {
    try {
      const files = await fs.readdir(BACKUPS_DIR);
      return files.filter((f) => f.startsWith(`${slug}-`) && f.endsWith('.zip')).map((f) => path.join(BACKUPS_DIR, f));
    } catch {
      return [];
    }
  },
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
