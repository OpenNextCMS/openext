import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { THEMES_TMP_DIR, REQUIRED_MANIFEST_FILE } from '../config';
import { ZipGuard } from '../security/ZipGuard';
import { ExtractionFailedError, ManifestMissingError } from '../errors';
import type { ExtractedTheme } from '../types';

/**
 * ExtractionService — safely extracts a validated theme ZIP to a temporary
 * workspace (spec §2, step "Extract to a temporary directory").
 *
 * Security is delegated to ZipGuard (SRP): this service only orchestrates
 * root detection, safe writes, and cleanup.
 */

/**
 * Package root = the folder that contains theme.json (shortest path wins). Handles
 * flat zips and single-wrapper zips (`my-theme/theme.json`) so files land at
 * package-relative paths (`layouts/…`, `pages/…`).
 */
function detectRootPrefix(archivePaths: string[]): string {
  const manifests = archivePaths.filter((p) => p === REQUIRED_MANIFEST_FILE || p.endsWith(`/${REQUIRED_MANIFEST_FILE}`));
  if (manifests.length === 0) return '';
  manifests.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length);
  const idx = manifests[0].lastIndexOf('/');
  return idx >= 0 ? manifests[0].slice(0, idx + 1) : '';
}

export const ExtractionService = {
  /** Extract to a fresh temp dir. Caller must `cleanup()` the returned tmpDir. */
  async extract(buffer: Buffer): Promise<ExtractedTheme> {
    const zip = await ZipGuard.load(buffer);
    const { entries, totalBytes } = ZipGuard.audit(zip);

    const rootPrefix = detectRootPrefix(entries.map((e) => e.archivePath));

    const tmpDir = path.join(THEMES_TMP_DIR, `extract-${randomUUID()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const files: string[] = [];
    let manifestRaw: string | null = null;

    try {
      for (const { archivePath, entry } of entries) {
        // Strip the wrapping folder so paths are package-relative.
        if (rootPrefix && !archivePath.startsWith(rootPrefix)) continue;
        const relativePath = rootPrefix ? archivePath.slice(rootPrefix.length) : archivePath;
        if (!relativePath) continue;

        // Zip-slip guard against the actual write target.
        const targetPath = ZipGuard.assertInsideTarget(tmpDir, relativePath);

        const content = await entry.async('nodebuffer');
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
        files.push(relativePath);

        if (relativePath === REQUIRED_MANIFEST_FILE) {
          manifestRaw = content.toString('utf8');
        }
      }
    } catch (err) {
      await this.cleanup(tmpDir);
      if (err instanceof ManifestMissingError) throw err;
      throw new ExtractionFailedError(err instanceof Error ? err.message : undefined, { tmpDir });
    }

    return { tmpDir, files, manifestRaw, totalBytes };
  },

  /** Remove a temp workspace; never throws (best-effort cleanup). */
  async cleanup(tmpDir: string): Promise<void> {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  },

  /** Ensure the base temp directory exists. */
  async ensureWorkspace(): Promise<void> {
    await fs.mkdir(THEMES_TMP_DIR, { recursive: true });
  },
};
