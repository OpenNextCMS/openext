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

/**
 * Compiled JS for theme `.tsx`/`.ts` source (spec §4.6 implementation detail).
 *
 * A theme package ships raw `.tsx` source, but it lives OUTSIDE Next.js's own
 * build graph (installed at RUNTIME, after the app is already built) — a plain
 * `import()` of a `.tsx` file is a Node.js module load, and Node has no idea
 * what JSX/TS syntax is (confirmed empirically: `Unknown file extension ".tsx"`).
 * `ThemeLoader` compiles each referenced source file to plain CommonJS once,
 * here, keyed by (slug, version, relative path) — the same versioning
 * discipline as `ThemeCache` — and imports the compiled output instead.
 */
export const COMPILED_ROOT = process.env.THEME_ENGINE_COMPILED_DIR
  ? path.resolve(process.env.THEME_ENGINE_COMPILED_DIR)
  : path.join(process.cwd(), 'storage', 'theme-engine-compiled');

/** Total unpacked package size cap — zip-bomb defence (spec §4.2 check 8). */
export const MAX_UNPACKED_BYTES =
  Number(process.env.THEME_ENGINE_MAX_UNPACKED_BYTES) || 50 * 1024 * 1024; // 50 MB

/** Per-entry cap enforced during extraction (spec §4.3 step 2). */
export const MAX_ENTRY_BYTES =
  Number(process.env.THEME_ENGINE_MAX_ENTRY_BYTES) || 10 * 1024 * 1024; // 10 MB

/** Max number of entries in a package — zip-bomb defence. */
export const MAX_ENTRIES = Number(process.env.THEME_ENGINE_MAX_ENTRIES) || 2000;

/** Max size of the raw uploaded .zip itself, before extraction (spec §4.3 step 1). */
export const MAX_UPLOAD_BYTES =
  Number(process.env.THEME_ENGINE_MAX_UPLOAD_BYTES) || 60 * 1024 * 1024; // 60 MB

/** Max (uncompressed / compressed) ratio per entry before it's treated as a bomb. */
export const MAX_COMPRESSION_RATIO =
  Number(process.env.THEME_ENGINE_MAX_COMPRESSION_RATIO) || 120;

/** Preview session lifetime (spec §1.3 / §4.12) — e.g. 30 min. */
export const PREVIEW_SESSION_TTL_MS =
  Number(process.env.THEME_ENGINE_PREVIEW_SESSION_TTL_MS) || 30 * 60 * 1000;

/**
 * `ThemeManager`'s built-in fallback theme (spec §4.13). Installed through the
 * exact same `ThemeInstaller` pipeline as any uploaded theme — no special-cased
 * render path — from source shipped in-repo at `DEFAULT_THEME_SOURCE_DIR`.
 * Slug intentionally avoids `default`/`_default`: not underscore-safe against
 * `ManifestParser`'s kebab-case slug rule, and "default" alone is a name a
 * real uploaded theme might legitimately want.
 */
export const DEFAULT_THEME_SLUG = 'theme-engine-default';
export const DEFAULT_THEME_SOURCE_DIR = path.join(process.cwd(), 'src', 'modules', 'themeEngine', 'default-theme-source');

/**
 * Preview-session cookie name (spec §4.12: httpOnly, `sameSite: strict`,
 * scoped to admin routes only). Only the ROUTE HANDLER ever reads/writes this
 * — `ThemePreviewService` and `ThemeRenderer` never touch cookies directly.
 */
export const PREVIEW_COOKIE_NAME = 'theme_engine_preview_token';

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
