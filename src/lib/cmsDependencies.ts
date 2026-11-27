import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';

declare const __non_webpack_require__: NodeRequire | undefined;
declare const __filename: string;

const ROOT = process.cwd();
const ROOT_PACKAGE_JSON = path.join(ROOT, 'package.json');

/** Default semver range when a theme/plugin declares a package name without a version. */
const DEFAULT_PLATFORM_VERSION = '*';

type PackageCache = {
  mtimeMs: number;
  names: Set<string>;
};

let cache: PackageCache | null = null;

function invalidatePackageCache(): void {
  cache = null;
}

function loadRootPackageJson(): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
} {
  const raw = fs.readFileSync(ROOT_PACKAGE_JSON, 'utf8');
  return JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    [key: string]: unknown;
  };
}

function loadRootDependencyNames(): Set<string> {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(ROOT_PACKAGE_JSON);
  } catch {
    return new Set();
  }

  if (cache && cache.mtimeMs === stat.mtimeMs) {
    return cache.names;
  }

  const pkg = loadRootPackageJson();
  const names = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);

  cache = { mtimeMs: stat.mtimeMs, names };
  return names;
}

function normalizePackageName(dep: string): string {
  return dep.trim();
}

export interface CmsDependencyStatus {
  satisfied: boolean;
  missingInPackageJson: string[];
  notInstalled: string[];
}

/** Package names declared in the CMS root package.json. */
export function getCmsDependencyNames(): string[] {
  return [...loadRootDependencyNames()].sort();
}

export function isDeclaredInCmsPackage(name: string): boolean {
  return loadRootDependencyNames().has(normalizePackageName(name));
}

/** Resolve a package from the CMS root node_modules (shared by plugins and themes). */
function getRootRequire(): NodeRequire {
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__;
  }
  return createRequire(__filename);
}

export function resolveCmsModule(packageName: string): void {
  getRootRequire().resolve(packageName, { paths: [ROOT] });
}

export function getCmsDependencyStatus(dependencies: string[]): CmsDependencyStatus {
  const missingInPackageJson: string[] = [];
  const notInstalled: string[] = [];

  for (const dep of dependencies) {
    const name = normalizePackageName(dep);
    if (!name) continue;

    if (!isDeclaredInCmsPackage(name)) {
      missingInPackageJson.push(name);
      continue;
    }

    try {
      resolveCmsModule(name);
    } catch {
      notInstalled.push(name);
    }
  }

  return {
    satisfied: missingInPackageJson.length === 0 && notInstalled.length === 0,
    missingInPackageJson,
    notInstalled,
  };
}

export function areCmsDependenciesReady(dependencies: string[]): boolean {
  if (dependencies.length === 0) return true;
  return getCmsDependencyStatus(dependencies).satisfied;
}

/**
 * Add missing platform package names to the CMS root package.json so the next
 * `npm install` at the project root installs everything uploaded themes/plugins need.
 */
export function mergePlatformDependenciesIntoPackageJson(packageNames: string[]): string[] {
  const pkg = loadRootPackageJson();
  const dependencies = { ...(pkg.dependencies ?? {}) };
  const added: string[] = [];

  for (const dep of packageNames) {
    const name = normalizePackageName(dep);
    if (!name || dependencies[name]) continue;
    dependencies[name] = DEFAULT_PLATFORM_VERSION;
    added.push(name);
  }

  if (added.length === 0) return added;

  pkg.dependencies = dependencies;
  fs.writeFileSync(ROOT_PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  invalidatePackageCache();
  return added;
}

export interface PluginDependencyRemovalResult {
  removed: string[];
  /** Declared by plugin but already a core CMS dependency (real version, not "*"). */
  keptCore: string[];
  /** Still required by another installed plugin. */
  keptShared: string[];
}

/**
 * Remove plugin-added packages from root package.json when no installed plugin still
 * declares them. Only entries added by upload (version "*") are removed so core CMS
 * dependencies are never stripped.
 */
export function removeUnusedPlatformDependenciesFromPackageJson(
  candidateNames: string[],
  stillRequiredNames: Iterable<string> = []
): PluginDependencyRemovalResult {
  const stillRequired = new Set(
    [...stillRequiredNames].map(normalizePackageName).filter(Boolean)
  );
  const pkg = loadRootPackageJson();
  const dependencies = { ...(pkg.dependencies ?? {}) };
  const removed: string[] = [];
  const keptCore: string[] = [];
  const keptShared: string[] = [];

  for (const dep of candidateNames) {
    const name = normalizePackageName(dep);
    if (!name) continue;
    if (stillRequired.has(name)) {
      keptShared.push(name);
      continue;
    }
    if (dependencies[name] !== DEFAULT_PLATFORM_VERSION) {
      if (dependencies[name]) keptCore.push(name);
      continue;
    }
    delete dependencies[name];
    removed.push(name);
  }

  if (removed.length > 0) {
    pkg.dependencies = dependencies;
    fs.writeFileSync(ROOT_PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    invalidatePackageCache();
  }

  return { removed, keptCore, keptShared };
}

/** Collect npm package names still declared by installed plugins. */
export async function collectPluginDeclaredDependencies(
  excludePluginId?: string
): Promise<Set<string>> {
  const { getUserDbConnection, getPluginModel } = await import('@/utils/db');
  await getUserDbConnection();
  const PluginModel = getPluginModel();
  const query = excludePluginId ? { pluginId: { $ne: excludePluginId } } : {};
  const plugins = await PluginModel.find(query).select('dependencies').lean();
  const names = new Set<string>();

  for (const plugin of plugins) {
    for (const dep of plugin.dependencies ?? []) {
      const name = normalizePackageName(dep);
      if (name) names.add(name);
    }
  }

  return names;
}

/**
 * On plugin remove: drop package.json entries that were added for this plugin only.
 * Shared packages (used by other plugins) and pre-existing CMS deps are kept.
 */
export async function unregisterPluginDependencies(
  pluginDependencies: string[],
  excludePluginId?: string
): Promise<PluginDependencyRemovalResult> {
  const normalized = pluginDependencies.map(normalizePackageName).filter(Boolean);
  if (normalized.length === 0) {
    return { removed: [], keptCore: [], keptShared: [] };
  }

  const stillRequired = await collectPluginDeclaredDependencies(excludePluginId);
  return removeUnusedPlatformDependenciesFromPackageJson(normalized, stillRequired);
}

export function formatPluginDependencyRemovalMessage(
  result: PluginDependencyRemovalResult
): string {
  const parts = ['Plugin removed successfully.'];
  if (result.removed.length > 0) {
    parts.push(
      `Removed from package.json: ${result.removed.join(', ')}. Run npm install to update node_modules.`
    );
  }
  if (result.keptCore.length > 0) {
    parts.push(
      `Kept core CMS packages: ${result.keptCore.join(', ')} (required by NextCMS, not plugin-only).`
    );
  }
  if (result.keptShared.length > 0) {
    parts.push(`Kept shared packages still used by other plugins: ${result.keptShared.join(', ')}.`);
  }
  return parts.join(' ');
}

export class CmsDependencyError extends Error {
  readonly missing: string[];
  readonly context: string;

  constructor(message: string, missing: string[], context: string) {
    super(message);
    this.name = 'CmsDependencyError';
    this.missing = missing;
    this.context = context;
  }
}

export function pendingDependenciesMessage(context: string, status: CmsDependencyStatus): string {
  const pending = [...new Set([...status.missingInPackageJson, ...status.notInstalled])];
  return (
    `${context} uploaded successfully. Run npm install at the CMS project root, restart the server, ` +
    `then activate ${context.includes('Plugin') ? 'the plugin' : 'the theme'}. ` +
    `Pending packages: ${pending.join(', ')}.`
  );
}

/**
 * On upload: merge declared deps into root package.json (for the next npm install).
 * Does not require node_modules to exist yet.
 */
export function registerUploadDependencies(
  dependencies: string[]
): { status: CmsDependencyStatus; addedToPackageJson: string[] } {
  const normalized = dependencies.map(normalizePackageName).filter(Boolean);
  const addedToPackageJson = mergePlatformDependenciesIntoPackageJson(normalized);
  const status = getCmsDependencyStatus(normalized);
  return { status, addedToPackageJson };
}

/** On activate / enable: deps must already be installed in root node_modules. */
export function assertCmsDependenciesAvailable(dependencies: string[], context: string): void {
  const status = getCmsDependencyStatus(dependencies);
  if (status.satisfied) return;

  const pending = [...new Set([...status.missingInPackageJson, ...status.notInstalled])];
  throw new CmsDependencyError(
    `${context} requires npm packages that are not installed yet. ` +
      `Run npm install at the CMS project root, restart the server, then try again. ` +
      `Pending: ${pending.join(', ')}.`,
    pending,
    context
  );
}
