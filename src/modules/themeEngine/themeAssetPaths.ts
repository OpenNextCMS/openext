import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

/** Candidate CSS paths in priority order (spec §7). */
export const STYLESHEET_CANDIDATES = [
  'styles/style.css',
  'assets/style.css',
] as const;

/** Candidate JS paths in priority order (spec §7). */
export const SCRIPT_CANDIDATES = [
  'scripts/theme.js',
  'assets/theme.js',
] as const;

export interface ThemeAssetPaths {
  stylesheet?: string;
  script?: string;
}

export interface ThemeAssetHashes extends ThemeAssetPaths {
  stylesheetHash?: string;
  scriptHash?: string;
}

async function firstExisting(root: string, candidates: readonly string[]): Promise<string | undefined> {
  for (const rel of candidates) {
    try {
      const abs = path.join(root, rel);
      if ((await fs.stat(abs)).isFile()) return rel.replace(/\\/g, '/');
    } catch {
      // try next
    }
  }
  return undefined;
}

/** Discover stylesheet/script relative paths on an installed theme directory. */
export async function discoverThemeAssetPaths(root: string): Promise<ThemeAssetPaths> {
  const [stylesheet, script] = await Promise.all([
    firstExisting(root, STYLESHEET_CANDIDATES),
    firstExisting(root, SCRIPT_CANDIDATES),
  ]);
  return { stylesheet, script };
}

/** Hash discovered assets once at install time. */
export async function hashThemeAssets(root: string): Promise<ThemeAssetHashes> {
  const paths = await discoverThemeAssetPaths(root);
  const out: ThemeAssetHashes = { ...paths };

  if (paths.stylesheet) {
    try {
      const content = await fs.readFile(path.join(root, paths.stylesheet));
      out.stylesheetHash = createHash('sha256').update(content).digest('hex');
    } catch {
      // optional
    }
  }
  if (paths.script) {
    try {
      const content = await fs.readFile(path.join(root, paths.script));
      out.scriptHash = createHash('sha256').update(content).digest('hex');
    } catch {
      // optional
    }
  }
  return out;
}

export function getScreenshotPath(manifestScreenshot?: string): string {
  const rel = manifestScreenshot?.trim() || 'screenshot.png';
  return rel.replace(/\\/g, '/');
}

export function buildScreenshotUrl(slug: string, manifestScreenshot?: string): string {
  const rel = getScreenshotPath(manifestScreenshot);
  return `/theme-engine-assets/${slug}/${rel}`;
}
