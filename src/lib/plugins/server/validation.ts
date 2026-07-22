import path from 'path';
import {
  hasBlockedExtension,
  isSafeRelativePath,
  type ParsedPluginManifest,
} from '@/lib/plugins/manifest';
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

  if (!normalized.startsWith('server/') && normalized !== 'package.json') {
    throw new Error(`${label} must be under server/ or package.json`);
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
      ? manifest.serverEntry.trim()
      : undefined;

  const hasServerFolder = relativePaths.some(
    (filePath) => filePath === 'server' || filePath.startsWith('server/')
  );

  const hasBackend = Boolean(serverEntryRaw || hasServerFolder);
  if (!hasBackend) {
    return {
      migrations: [],
      models: [],
      permissions: [],
      dependencies: [],
      hasBackend: false,
    };
  }

  let serverEntry = serverEntryRaw;
  if (!serverEntry) {
    if (relativePaths.includes('server/index.js')) {
      serverEntry = 'server/index.js';
    } else {
      throw new Error('Backend plugin requires manifest.serverEntry or server/index.js');
    }
  }

  serverEntry = assertSafeBackendPath(serverEntry, 'manifest.serverEntry');
  if (!relativePaths.includes(serverEntry)) {
    throw new Error(`manifest.serverEntry "${serverEntry}" was not found in the package`);
  }

  const migrations = Array.isArray(manifest.migrations)
    ? manifest.migrations.map((entry) => assertSafeBackendPath(String(entry), 'manifest.migrations'))
    : relativePaths.some((p) => p.startsWith('server/migrations/'))
      ? ['server/migrations']
      : [];

  const models = Array.isArray(manifest.models)
    ? manifest.models.map((entry) => assertSafeBackendPath(String(entry), 'manifest.models'))
    : relativePaths.some((p) => p.startsWith('server/models/'))
      ? ['server/models']
      : [];

  const permissions = Array.isArray(manifest.permissions)
    ? manifest.permissions.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : [];

  const installHook =
    typeof manifest.installHook === 'string' && manifest.installHook.trim()
      ? assertSafeBackendPath(manifest.installHook.trim(), 'manifest.installHook')
      : undefined;

  const uninstallHook =
    typeof manifest.uninstallHook === 'string' && manifest.uninstallHook.trim()
      ? assertSafeBackendPath(manifest.uninstallHook.trim(), 'manifest.uninstallHook')
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
