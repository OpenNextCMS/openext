/**
 * Universal plugin-extension constants.
 * These apply to extension packages only. Complete plugin ZIPs keep their own limits.
 */

export const EXTENSION_SDK_VERSION = '1.0.0';

/** Matches package.json version. Override at runtime with CMS_VERSION; do not edit secrets. */
export const DEFAULT_CMS_VERSION = '0.1.0';

export const EXTENSION_MANIFEST_VERSION = 1;

export const MAX_EXTENSION_EXTRACTED_BYTES = 80 * 1024 * 1024;
export const MAX_EXTENSION_FILE_BYTES = 15 * 1024 * 1024;
export const EXTENSION_LOCK_TTL_MS = 120_000;
export const EXTENSION_HISTORY_LIMIT = 50;
export const STAGING_TTL_MS = 24 * 60 * 60 * 1000;

export const EXTENSION_STORAGE_ENV = 'EXTENSIONS_STORAGE_DIR';

export const EXTENSION_CAPABILITIES = [
  'navigation.register',
  'ui.page.register',
  'api.register',
  'events.subscribe',
  'settings.register',
  'fields.register',
  'workflows.register',
  'lifecycle.register',
  'migrations.register',
] as const;

export type ExtensionCapability = (typeof EXTENSION_CAPABILITIES)[number];

export const EXTENSION_STATUSES = [
  'installed',
  'enabled',
  'disabled',
  'failed',
  'uninstalled',
] as const;

export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number];

export const EXTENSION_HEALTH = ['unknown', 'healthy', 'degraded', 'error'] as const;

export type ExtensionHealth = (typeof EXTENSION_HEALTH)[number];

export const TRUST_STATES = ['pending', 'approved', 'denied'] as const;

export type TrustState = (typeof TRUST_STATES)[number];

export const MIGRATION_STATES = ['none', 'pending', 'applied', 'failed'] as const;

export type MigrationState = (typeof MIGRATION_STATES)[number];

/** Top-level directories an extension package may contain. The manifest is the only required file. */
export const ALLOWED_EXTENSION_ROOTS = new Set(['ui', 'server', 'migrations', 'assets']);

export const ALLOWED_FILE_EXTENSIONS = new Set([
  '.json',
  '.md',
  '.txt',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
]);

/** Runtime-loadable backend scripts after install (compiled output or plain JS). */
export const SERVER_SCRIPT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

/** Backend entry paths allowed in the uploaded package (compiled or TypeScript source). */
export const SERVER_ENTRY_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx']);

export const EXTENSION_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/;

export const STAGING_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCmsVersion(): string {
  const configured = process.env.CMS_VERSION?.trim();
  return configured || DEFAULT_CMS_VERSION;
}
