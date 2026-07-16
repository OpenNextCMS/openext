import path from 'path';

/**
 * Theme Engine — configuration (spec §3, §4.2, §4.3).
 *
 * Single source of truth for limits, paths and the CMS version themes are
 * validated against. Everything is overridable by env so deployments can tune
 * limits without a code change.
 */

/**
 * The CMS version a theme's `compatibleCmsVersion` range is checked against
 * (spec §4.2 check 2: `semver.satisfies(currentCmsVersion, range)`).
 *
 * NOTE: deliberately NOT read from package.json — that field tracks the app
 * build (currently `0.1.0`), not the public theme-API contract. Bump this only
 * when the theme API changes in a way themes must react to.
 */
export const CMS_VERSION = process.env.THEME_ENGINE_CMS_VERSION?.trim() || '2.0.0';

/** Installed themes live here: `/themes/{slug}` (spec §3). */
export const THEMES_ROOT = process.env.THEME_ENGINE_THEMES_DIR
  ? path.resolve(process.env.THEME_ENGINE_THEMES_DIR)
  : path.join(process.cwd(), 'themes');

/** Uploads are extracted here first — never straight into THEMES_ROOT (spec §4.3). */
export const TEMP_UPLOAD_ROOT = process.env.THEME_ENGINE_TMP_DIR
  ? path.resolve(process.env.THEME_ENGINE_TMP_DIR)
  : path.join(process.cwd(), 'storage', 'tmp', 'theme-uploads');

/** Total unpacked package size cap — zip-bomb defence (spec §4.2 check 8). */
export const MAX_UNPACKED_BYTES =
  Number(process.env.THEME_ENGINE_MAX_UNPACKED_BYTES) || 50 * 1024 * 1024; // 50 MB

/** Per-entry cap enforced during extraction (spec §4.3 step 2). */
export const MAX_ENTRY_BYTES =
  Number(process.env.THEME_ENGINE_MAX_ENTRY_BYTES) || 10 * 1024 * 1024; // 10 MB

/** Max number of entries in a package — zip-bomb defence. */
export const MAX_ENTRIES = Number(process.env.THEME_ENGINE_MAX_ENTRIES) || 2000;

/** The manifest filename; the ONLY `.json` permitted in a package (spec §3). */
export const MANIFEST_FILENAME = 'theme.json';

/**
 * Extensions allowed anywhere in a package (spec §3).
 * `.ts` and `.json` are NOT here — they are context-restricted:
 *   • `.ts`   → block schema files only (under `blocks/`)
 *   • `.json` → the root manifest only
 */
export const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.tsx',
  '.css',
  '.js', // client-only, sandboxed: emitted as a <script> tag, never imported server-side
  '.woff',
  '.woff2',
  '.ttf',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.avif',
]);

/** Directory that block schema `.ts` files must live under (spec §3). */
export const BLOCKS_DIR = 'blocks';
