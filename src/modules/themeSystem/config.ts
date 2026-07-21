import path from 'path';

/**
 * Central configuration for the Theme Upload System.
 *
 * SOLID (SRP): one place owns every tunable limit + filesystem location, so no
 * magic numbers or hard-coded paths leak into services. Paths follow the spec:
 * installed themes under `/themes`, rollback archives under `/storage/backups`.
 */

/** Semantic version of this CMS's theme API surface (compatibility gate, §15). */
export const CMS_VERSION = '1.0.0';

/** Database schema version themes may declare a dependency on (§15). */
export const DB_SCHEMA_VERSION = '1.0.0';

/** Minimum Node.js runtime the theme system supports (§15). */
export const MIN_NODE_VERSION = '18.0.0';

/** Absolute project root (Next.js runs from the project directory). */
export const PROJECT_ROOT = process.cwd();

/** Installed themes live here — one subfolder per slug: `/themes/<slug>`. */
export const THEMES_DIR = path.join(PROJECT_ROOT, 'themes');

/** Temporary extraction workspace (cleaned after install/update). */
export const THEMES_TMP_DIR = path.join(PROJECT_ROOT, 'storage', 'tmp', 'themes');

/** Rollback archives: `/storage/backups/themes/<slug>-<version>.zip`. */
export const BACKUPS_DIR = path.join(PROJECT_ROOT, 'storage', 'backups', 'themes');

/** Upload + extraction limits (spec §5). */
export const LIMITS = {
  /** Max uploaded ZIP size — 100 MB. */
  MAX_UPLOAD_BYTES: 100 * 1024 * 1024,
  /** Max total decompressed size across all entries — zip-bomb guard. */
  MAX_EXTRACTED_BYTES: 300 * 1024 * 1024,
  /** Max number of entries in the archive — zip-bomb guard. */
  MAX_ENTRIES: 5000,
  /** Max size of any single decompressed entry. */
  MAX_ENTRY_BYTES: 25 * 1024 * 1024,
  /** Max compression ratio per entry before it is treated as a bomb. */
  MAX_COMPRESSION_RATIO: 120,
} as const;

/** Accepted upload MIME types (browsers vary; extension is also checked). */
export const ACCEPTED_ZIP_MIME = new Set<string>([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'multipart/x-zip',
]);

/** Required top-level manifest + assets the package must contain (spec §1, §4). */
export const REQUIRED_MANIFEST_FILE = 'theme.json';

/** Top-level folders a valid theme package must include (spec §1, §4). */
export const REQUIRED_TOP_LEVEL_DIRS = ['pages', 'components', 'layouts', 'styles', 'assets'] as const;

/**
 * File extensions that must never be extracted from a theme package (spec §5).
 * Executables, server scripts, and shell files.
 */
export const BLOCKED_EXTENSIONS = new Set<string>([
  '.exe', '.bat', '.cmd', '.com', '.dll', '.msi', '.scr',
  '.sh', '.bash', '.zsh', '.ps1', '.psm1',
  '.php', '.phtml', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb',
  '.jar', '.war', '.vbs', '.wsf', '.htaccess', '.so', '.dylib', '.bin',
]);

/** Paths that must never be bundled inside a theme (spec §5). */
export const BLOCKED_PATH_SEGMENTS = new Set<string>(['node_modules', '.git', '.env']);

/** Exact filenames that are blocked wherever they appear. */
export const BLOCKED_FILENAMES = new Set<string>(['.env', '.env.local', '.env.production', '.npmrc', '.gitignore']);

/** Slug pattern for filesystem + URL safety. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** Key under which the active theme slug is persisted in CMS settings (§6). */
export const ACTIVE_THEME_SETTINGS_KEY = 'activeTheme';
