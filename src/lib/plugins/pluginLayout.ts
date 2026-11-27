import path from 'path';

/** Frontend folder inside a plugin package (replaces admin/, block/, assets/ at package root). */
export const PLUGIN_UI_DIR = 'ui';

/** Backend folder inside a plugin package (replaces server/). */
export const PLUGIN_API_DIR = 'api';

export const PLUGIN_MANIFEST_FILE = 'manifest.json';

/**
 * Required ZIP layout:
 *
 *   {pluginId}/
 *     {pluginId}/
 *       manifest.json
 *       ui/          — dashboard + block frontend
 *       api/         — backend routes, models, migrations (optional)
 */
export function getNestedPackageSegment(pluginId: string): string {
  return pluginId;
}

/** Disk: `src/plugins/{pluginId}/{pluginId}/` */
export function getPluginPackageRelativePath(pluginId: string): string {
  return `${pluginId}/${pluginId}`;
}

/** Disk: `src/app/api/plugins/[pluginId]/{pluginId}/` */
export function getPluginBackendPackageRelativePath(pluginId: string): string {
  return pluginId;
}

function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Resolve the package root inside a ZIP to `{pluginId}/{pluginId}/`.
 * Falls back to a single wrapper folder when it contains ui/ or api/ and manifest.json.
 */
export function resolvePluginPackageRootInZip(
  filePaths: string[],
  pluginId: string
): { zipPrefix: string; manifestRelativePath: string } {
  const normalized = filePaths.map(normalizeZipPath).filter(Boolean);
  const nestedManifest = `${pluginId}/${pluginId}/${PLUGIN_MANIFEST_FILE}`;

  if (normalized.some((p) => p === nestedManifest || p.endsWith(`/${nestedManifest}`))) {
    const atRoot = normalized.includes(nestedManifest);
    const zipPrefix = atRoot ? '' : normalized.find((p) => p.endsWith(`/${nestedManifest}`))!.slice(0, -(nestedManifest.length));
    const prefix = zipPrefix ? `${zipPrefix}/` : '';
    return {
      zipPrefix: prefix,
      manifestRelativePath: `${pluginId}/${pluginId}/${PLUGIN_MANIFEST_FILE}`,
    };
  }

  // Single wrapper: {pluginId}/manifest.json with ui/ or api/
  const singleManifest = `${pluginId}/${PLUGIN_MANIFEST_FILE}`;
  if (normalized.includes(singleManifest)) {
    const hasUi = normalized.some((p) => p.startsWith(`${pluginId}/${PLUGIN_UI_DIR}/`));
    const hasApi = normalized.some((p) => p.startsWith(`${pluginId}/${PLUGIN_API_DIR}/`));
    if (hasUi || hasApi) {
      return {
        zipPrefix: '',
        manifestRelativePath: singleManifest,
      };
    }
  }

  // Legacy flat manifest at zip root
  const legacyCandidates = normalized.filter(
    (p) => p === PLUGIN_MANIFEST_FILE || p.endsWith(`/${PLUGIN_MANIFEST_FILE}`)
  );
  if (legacyCandidates.length > 0) {
    legacyCandidates.sort((a, b) => a.split('/').length - b.split('/').length);
    const manifestPath = legacyCandidates[0];
    return { zipPrefix: '', manifestRelativePath: manifestPath };
  }

  throw new Error(
    `Plugin package must use ${pluginId}/${pluginId}/manifest.json with ui/ and optional api/ folders`
  );
}

export function isUiRelativePath(relativePath: string): boolean {
  return (
    relativePath === PLUGIN_UI_DIR ||
    relativePath.startsWith(`${PLUGIN_UI_DIR}/`) ||
    relativePath === PLUGIN_MANIFEST_FILE
  );
}

export function isApiRelativePath(relativePath: string): boolean {
  return (
    relativePath === PLUGIN_API_DIR ||
    relativePath.startsWith(`${PLUGIN_API_DIR}/`) ||
    relativePath === 'package.json'
  );
}

/** Legacy frontend paths (pre ui/ layout). */
export function isLegacyFrontendRelativePath(relativePath: string): boolean {
  if (relativePath === PLUGIN_MANIFEST_FILE) return true;
  const legacyPrefixes = ['admin/', 'block/', 'assets/', 'fonts/', 'dashboard/'];
  return legacyPrefixes.some(
    (prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix)
  );
}

/** Legacy backend paths (pre api/ layout). */
export function isLegacyBackendRelativePath(relativePath: string): boolean {
  return (
    relativePath === 'server' ||
    relativePath.startsWith('server/') ||
    relativePath === 'package.json'
  );
}

export function usesUiApiLayout(relativePaths: string[]): boolean {
  return relativePaths.some(
    (p) => p.startsWith(`${PLUGIN_UI_DIR}/`) || p.startsWith(`${PLUGIN_API_DIR}/`)
  );
}

export function normalizeBackendEntryPath(entry: string): string {
  if (entry.startsWith('server/')) {
    return entry.replace(/^server\//, `${PLUGIN_API_DIR}/`);
  }
  return entry;
}

export function backendRoutesDir(pluginDir: string): string {
  return path.join(pluginDir, PLUGIN_API_DIR, 'routes');
}

export function backendModelsDir(pluginDir: string): string {
  return path.join(pluginDir, PLUGIN_API_DIR, 'models');
}

export function defaultApiEntry(relativePaths: string[]): string | undefined {
  if (relativePaths.includes(`${PLUGIN_API_DIR}/index.js`)) return `${PLUGIN_API_DIR}/index.js`;
  if (relativePaths.includes('server/index.js')) return 'server/index.js';
  return undefined;
}

export function defaultMigrationsDir(relativePaths: string[]): string[] {
  if (relativePaths.some((p) => p.startsWith(`${PLUGIN_API_DIR}/migrations/`))) {
    return [`${PLUGIN_API_DIR}/migrations`];
  }
  if (relativePaths.some((p) => p.startsWith('server/migrations/'))) {
    return ['server/migrations'];
  }
  return [];
}

export function defaultModelsDir(relativePaths: string[]): string[] {
  if (relativePaths.some((p) => p.startsWith(`${PLUGIN_API_DIR}/models/`))) {
    return [`${PLUGIN_API_DIR}/models`];
  }
  if (relativePaths.some((p) => p.startsWith('server/models/'))) {
    return ['server/models'];
  }
  return [];
}
