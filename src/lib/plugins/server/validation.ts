import path from 'path';
import {
  hasBlockedExtension,
  isSafeRelativePath,
  type ParsedPluginManifest,
} from '@/lib/plugins/manifest';
import {
  defaultApiEntry,
  defaultMigrationsDir,
  defaultModelsDir,
  normalizeBackendEntryPath,
  PLUGIN_API_DIR,
} from '@/lib/plugins/pluginLayout';
import {
  BLOCKED_PLUGIN_PATH_SEGMENTS,
  isBackendRelativePath,
  isFrontendRelativePath,
} from '@/lib/plugins/server/storage';

const BLOCKED_BACKEND_FILES = new Set([
  '.env',
  'node_modules',
  '.git',
]);

function isAllowedBackendRoot(relativePath: string): boolean {
  return (
    relativePath.startsWith(`${PLUGIN_API_DIR}/`) ||
    relativePath === `${PLUGIN_API_DIR}` ||
    relativePath.startsWith('server/') ||
    relativePath === 'server' ||
    relativePath === 'package.json'
  );
}

export function assertSafeBackendPath(relativePath: string, label: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || !isSafeRelativePath(normalized)) {
    throw new Error(`${label} must be a safe relative path`);
  }
  if (hasBlockedExtension(normalized)) {
    throw new Error(`${label} uses a blocked file extension`);
  }

  const segments = normalized.split('/');
  for (const segment of segments) {
    if (BLOCKED_PLUGIN_PATH_SEGMENTS.has(segment) || BLOCKED_BACKEND_FILES.has(segment)) {
      throw new Error(`${label} contains a blocked path segment "${segment}"`);
    }
  }

  if (!isAllowedBackendRoot(normalized)) {
    throw new Error(`${label} must be under api/ (or legacy server/) or package.json`);
  }

  return normalized;
}

export function validateBackendManifest(manifest: ParsedPluginManifest, relativePaths: string[]): {
  serverEntry?: string;
  migrations: string[];
  models: string[];
  permissions: string[];
  installHook?: string;
  uninstallHook?: string;
  dependencies: string[];
  hasBackend: boolean;
} {
  const serverEntryRaw =
    typeof manifest.serverEntry === 'string' && manifest.serverEntry.trim()
      ? normalizeBackendEntryPath(manifest.serverEntry.trim())
      : undefined;

  const hasApiFolder = relativePaths.some(
    (filePath) => filePath === PLUGIN_API_DIR || filePath.startsWith(`${PLUGIN_API_DIR}/`)
  );
  const hasServerFolder = relativePaths.some(
    (filePath) => filePath === 'server' || filePath.startsWith('server/')
  );

  const hasBackend = Boolean(serverEntryRaw || hasApiFolder || hasServerFolder);
  if (!hasBackend) {
    return {
      migrations: [],
      models: [],
      permissions: [],
      dependencies: [],
      hasBackend: false,
    };
  }

  let serverEntry = serverEntryRaw ?? defaultApiEntry(relativePaths);
  if (!serverEntry) {
    throw new Error(
      `Backend plugin requires manifest.serverEntry or ${PLUGIN_API_DIR}/index.js (or legacy server/index.js)`
    );
  }

  serverEntry = assertSafeBackendPath(serverEntry, 'manifest.serverEntry');
  if (!relativePaths.includes(serverEntry)) {
    throw new Error(`manifest.serverEntry "${serverEntry}" was not found in the package`);
  }

  const migrations = Array.isArray(manifest.migrations)
    ? manifest.migrations.map((entry) =>
        assertSafeBackendPath(normalizeBackendEntryPath(String(entry)), 'manifest.migrations')
      )
    : defaultMigrationsDir(relativePaths);

  const models = Array.isArray(manifest.models)
    ? manifest.models.map((entry) =>
        assertSafeBackendPath(normalizeBackendEntryPath(String(entry)), 'manifest.models')
      )
    : defaultModelsDir(relativePaths);

  const permissions = Array.isArray(manifest.permissions)
    ? manifest.permissions.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : [];

  const installHook =
    typeof manifest.installHook === 'string' && manifest.installHook.trim()
      ? assertSafeBackendPath(normalizeBackendEntryPath(manifest.installHook.trim()), 'manifest.installHook')
      : undefined;

  const uninstallHook =
    typeof manifest.uninstallHook === 'string' && manifest.uninstallHook.trim()
      ? assertSafeBackendPath(
          normalizeBackendEntryPath(manifest.uninstallHook.trim()),
          'manifest.uninstallHook'
        )
      : undefined;

  if (installHook && !relativePaths.includes(installHook)) {
    throw new Error(`manifest.installHook "${installHook}" was not found in the package`);
  }

  if (uninstallHook && !relativePaths.includes(uninstallHook)) {
    throw new Error(`manifest.uninstallHook "${uninstallHook}" was not found in the package`);
  }

  const dependencies = Array.isArray(manifest.dependencies)
    ? manifest.dependencies.filter((d): d is string => typeof d === 'string')
    : [];

  return {
    serverEntry,
    migrations,
    models,
    permissions,
    installHook,
    uninstallHook,
    dependencies,
    hasBackend: true,
  };
}

export function shouldExtractToFrontend(relativePath: string): boolean {
  if (!relativePath || !isSafeRelativePath(relativePath) || hasBlockedExtension(relativePath)) {
    return false;
  }

  const segments = relativePath.split('/');
  for (const segment of segments) {
    if (BLOCKED_PLUGIN_PATH_SEGMENTS.has(segment)) return false;
  }

  return isFrontendRelativePath(relativePath);
}

export function shouldExtractToBackend(relativePath: string): boolean {
  if (!relativePath || !isSafeRelativePath(relativePath) || hasBlockedExtension(relativePath)) {
    return false;
  }

  const segments = relativePath.split('/');
  for (const segment of segments) {
    if (BLOCKED_PLUGIN_PATH_SEGMENTS.has(segment)) return false;
  }

  return isBackendRelativePath(relativePath);
}

export function resolveBackendModulePath(pluginDir: string, relativePath: string): string {
  const resolved = path.resolve(pluginDir, relativePath);
  if (!resolved.startsWith(path.resolve(pluginDir))) {
    throw new Error('Path traversal detected in plugin module path');
  }
  return resolved;
}
