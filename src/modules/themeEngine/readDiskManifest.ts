import fs from 'fs/promises';
import path from 'path';
import { THEMES_ROOT, MANIFEST_FILENAME } from './config';
import { manifestParser } from './ManifestParser';
import { themeBootstrap } from './registration/ThemeBootstrap';
import type { ThemeManifest } from './types';

/**
 * Read + bootstrap `themes/{slug}/theme.json` from disk.
 * Runs auto-discovery and (when present) theme.ts registration to produce the
 * effective manifest used by ThemeLoader — so in-place package updates apply
 * without requiring a full re-upload when the DB manifest is stale.
 */
export async function readDiskManifest(slug: string): Promise<ThemeManifest | null> {
  try {
    const root = path.join(THEMES_ROOT, slug);
    const abs = path.join(root, MANIFEST_FILENAME);
    const raw = await fs.readFile(abs, 'utf8');
    const json = JSON.parse(raw) as unknown;
    const { manifest: base } = manifestParser.parse(json);

    const boot = await themeBootstrap.bootstrap(root, {
      executeEntry: true,
      slug,
      version: base.version,
    });

    if (boot.errors.length > 0) {
      console.warn(
        `[themeEngine] readDiskManifest bootstrap warnings for "${slug}":`,
        boot.errors.map((e) => e.message).join('; ')
      );
    }

    return boot.manifest;
  } catch {
    return null;
  }
}
