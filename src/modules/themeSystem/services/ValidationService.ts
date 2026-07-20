import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import {
  CMS_VERSION,
  DB_SCHEMA_VERSION,
  MIN_NODE_VERSION,
  REQUIRED_TOP_LEVEL_DIRS,
  REQUIRED_MANIFEST_FILE,
  SLUG_PATTERN,
} from '../config';
import {
  InvalidManifestError,
  InvalidStructureError,
  ManifestMissingError,
  UnsupportedCmsVersionError,
  UnsupportedDependencyError,
} from '../errors';
import { isValidSemver, satisfies, nodeSatisfiesMinimum } from '../utils/version';
import type { ThemeManifest } from '../types';

/**
 * ValidationService — enforces every manifest, structure, and compatibility rule
 * (spec §4 & §15) with a strict schema. Pure functions over a temp directory +
 * raw manifest string; throws typed errors on the first failure.
 */

/** Strict JSON schema for theme.json (spec §1). Unknown keys are preserved under settings only. */
const manifestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => SLUG_PATTERN.test(s), 'slug must be 3–64 chars of lowercase letters, numbers and hyphens'),
  version: z.string().trim().refine(isValidSemver, 'version must be valid semver (e.g. 1.0.0)'),
  author: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(1000).optional().default(''),
  homepage: z.string().trim().url('homepage must be a valid URL').optional().or(z.literal('')).optional(),
  license: z.string().trim().max(64).optional().default(''),
  minimumCMSVersion: z.string().trim().optional(),
  thumbnail: z.string().trim().min(1, 'thumbnail is required'),
  settings: z.record(z.unknown()).optional().default({}),
  dependencies: z.record(z.string()).optional(),
  requires: z
    .object({ node: z.string().optional(), dbSchema: z.string().optional() })
    .optional(),
});

export const ValidationService = {
  /** Parse + strictly validate the raw manifest string (spec §4). */
  validateManifest(raw: string | null): ThemeManifest {
    if (raw == null) throw new ManifestMissingError();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InvalidManifestError('theme.json is not valid JSON.');
    }
    const result = manifestSchema.safeParse(parsed);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      throw new InvalidManifestError('theme.json failed schema validation.', { fields });
    }
    const m = result.data;
    return {
      name: m.name,
      slug: m.slug,
      version: m.version,
      author: m.author ?? '',
      description: m.description ?? '',
      homepage: m.homepage || undefined,
      license: m.license || undefined,
      minimumCMSVersion: m.minimumCMSVersion || undefined,
      thumbnail: m.thumbnail,
      settings: (m.settings ?? {}) as Record<string, unknown>,
      dependencies: m.dependencies,
      requires: m.requires,
    };
  },

  /** Verify required folders + the thumbnail file exist on disk (spec §4). */
  async validateStructure(tmpDir: string, manifest: ThemeManifest): Promise<void> {
    const missing: string[] = [];

    // Manifest itself.
    if (!(await pathExists(path.join(tmpDir, REQUIRED_MANIFEST_FILE)))) {
      throw new ManifestMissingError();
    }

    // Required top-level directories.
    for (const dir of REQUIRED_TOP_LEVEL_DIRS) {
      if (!(await isDirectory(path.join(tmpDir, dir)))) missing.push(`${dir}/`);
    }

    // Thumbnail/screenshot file referenced by the manifest.
    const thumbRel = manifest.thumbnail.replace(/^\.?\//, '');
    if (!(await pathExists(path.join(tmpDir, thumbRel)))) {
      missing.push(manifest.thumbnail);
    }

    if (missing.length) throw new InvalidStructureError(missing);
  },

  /** Pre-install compatibility gate: CMS version, DB schema, Node, dependencies (spec §15). */
  checkCompatibility(manifest: ThemeManifest): void {
    if (manifest.minimumCMSVersion && !satisfies(CMS_VERSION, `>=${normalizeRangeBase(manifest.minimumCMSVersion)}`)) {
      throw new UnsupportedCmsVersionError(manifest.minimumCMSVersion, CMS_VERSION);
    }

    const nodeReq = manifest.requires?.node;
    if (nodeReq) {
      const nodeVersion = process.versions.node;
      const ok = /^\d/.test(nodeReq)
        ? nodeSatisfiesMinimum(nodeVersion, normalizeRangeBase(nodeReq))
        : satisfies(nodeVersion, nodeReq);
      if (!ok) throw new UnsupportedDependencyError('node', nodeReq, nodeVersion);
    } else if (!nodeSatisfiesMinimum(process.versions.node, MIN_NODE_VERSION)) {
      throw new UnsupportedDependencyError('node', `>=${MIN_NODE_VERSION}`, process.versions.node);
    }

    const dbReq = manifest.requires?.dbSchema;
    if (dbReq && !satisfies(DB_SCHEMA_VERSION, dbReq.startsWith('>') || dbReq.startsWith('^') || dbReq.startsWith('~') ? dbReq : `>=${dbReq}`)) {
      throw new UnsupportedDependencyError('dbSchema', dbReq, DB_SCHEMA_VERSION);
    }

    // Declared theme→theme or theme→plugin dependencies are validated by name/range
    // shape here; concrete resolution happens in InstallService against the DB.
    for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
      if (!name || !range) throw new UnsupportedDependencyError(name || '(unnamed)', range || '(no range)', null);
    }
  },
};

/** Strip a leading operator so a bare "1.0.0" or "^1.0.0" both yield "1.0.0". */
function normalizeRangeBase(range: string): string {
  return range.replace(/^[\^~>=<\s]+/, '').trim();
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}
