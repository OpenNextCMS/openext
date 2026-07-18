import fs from 'fs/promises';
import path from 'path';
import { THEMES_ROOT, MANIFEST_FILENAME } from './config';
import { manifestParser } from './ManifestParser';
import type { ThemeManifest } from './types';

/**
 * Read + parse `themes/{slug}/theme.json` from disk.
 * Used so in-place package updates (editableSections, new blocks) take effect
 * without requiring a full re-upload when the DB manifest is stale.
 */
export async function readDiskManifest(slug: string): Promise<ThemeManifest | null> {
  try {
    const abs = path.join(THEMES_ROOT, slug, MANIFEST_FILENAME);
    const raw = await fs.readFile(abs, 'utf8');
    const json = JSON.parse(raw) as unknown;
    const { manifest } = manifestParser.parse(json);
    return manifest;
  } catch {
    return null;
  }
}
