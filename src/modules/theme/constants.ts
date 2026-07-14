/**
 * Theme Package Manager — platform limits and identifiers.
 * Tuned for production: zip-bomb resistance without rejecting legitimate packages.
 */

/** Semver of this CMS's theme-package API surface (used for compatibleCms checks). */
export const CMS_THEME_API_VERSION = '1.0.0';

/** Package format tag written into exported theme.json */
export const THEME_PACKAGE_FORMAT = 'nextcms-theme-package';

/** Current package format version number */
export const THEME_PACKAGE_FORMAT_VERSION = 2;

/** Max uploaded ZIP size (25 MB). */
export const MAX_THEME_PACKAGE_BYTES = 25 * 1024 * 1024;

/** Max total uncompressed size across all entries (50 MB) — zip-bomb guard. */
export const MAX_THEME_EXTRACTED_BYTES = 50 * 1024 * 1024;

/** Max files allowed in a package. */
export const MAX_THEME_PACKAGE_FILES = 500;

/** Max size of a single extracted file. */
export const MAX_THEME_SINGLE_FILE_BYTES = 8 * 1024 * 1024;

/** Max size for preview / thumbnail images written to disk. */
export const MAX_THEME_IMAGE_BYTES = 2 * 1024 * 1024;

/** Allowed MIME / extension hints for theme ZIPs. */
export const THEME_ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'multipart/x-zip',
]);

/** Extensions blocked from extraction (executables / scripts). */
export const BLOCKED_THEME_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.msi',
  '.ps1',
  '.sh',
  '.bash',
  '.php',
  '.phtml',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
  '.py',
  '.rb',
  '.pl',
  '.jar',
  '.war',
  '.vbs',
  '.wsf',
  '.htaccess',
]);

/** Safe asset extensions that may be served / stored. */
export const ALLOWED_THEME_ASSET_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.map',
  '.txt',
  '.md',
]);

export const THEME_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** Public URL prefix for theme assets (never expose filesystem paths). */
export const THEME_ASSETS_PUBLIC_PREFIX = '/theme-assets';
