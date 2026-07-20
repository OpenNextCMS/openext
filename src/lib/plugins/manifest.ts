export type PluginKind = 'block' | 'system';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  /** Category label (e.g. slider, chart). Not the same as kind. */
  type?: string;
  /** Explicit package kind: editor block vs dashboard system plugin. */
  kind?: PluginKind | string;
  icon?: string;
  entryPoint?: string;
  /** Dashboard admin entry (HTML) for system plugins. */
  adminEntry?: string;
  /** Optional canvas block entry for system plugins that also ship a placeable block. */
  blockEntry?: string;
  styles?: string[];
  customElement?: string;
}

export interface ParsedPluginManifest extends PluginManifest {
  pluginId: string;
  /** Provisional; finalized by resolvePluginKind after seeing package files. */
  kind?: PluginKind;
  entryPoint?: string;
  styles: string[];
}

export interface ResolvedPluginPackage {
  kind: PluginKind;
  /** Category / marketplace type string stored on the Plugin row. */
  type: string;
  entryPoint?: string;
  adminEntry?: string;
  blockEntry?: string;
  styles: string[];
}

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/;
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.msi',
  '.com',
  '.scr',
]);

export function sanitizePluginId(value: string): string {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!sanitized) return `plugin-${Date.now()}`;
  if (sanitized.length < 3) return `${sanitized}-plugin`;
  return sanitized.slice(0, 64);
}

export function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath.startsWith('/') || filePath.includes('\\')) return false;
  const segments = filePath.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function hasBlockedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [...BLOCKED_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function asPluginKind(value: unknown): PluginKind | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'block' || normalized === 'system') return normalized;
  return null;
}

function pathExists(relativePaths: string[], candidate: string): boolean {
  return relativePaths.includes(candidate.replace(/\\/g, '/'));
}

function hasAdminSignals(relativePaths: string[], manifest: ParsedPluginManifest): boolean {
  if (manifest.adminEntry && isSafeRelativePath(manifest.adminEntry.trim())) return true;
  return relativePaths.some(
    (filePath) =>
      filePath === 'admin' ||
      filePath.startsWith('admin/') ||
      filePath === 'dashboard' ||
      filePath.startsWith('dashboard/')
  );
}

/**
 * Decide block vs system from explicit manifest fields, then folder heuristics.
 */
export function resolvePluginKind(
  manifest: ParsedPluginManifest,
  relativePaths: string[]
): ResolvedPluginPackage {
  const explicitKind = asPluginKind(manifest.kind) ?? asPluginKind(manifest.type);
  const kind: PluginKind =
    explicitKind ?? (hasAdminSignals(relativePaths, manifest) ? 'system' : 'block');

  // Keep category `type` separate from kind. If authors used type as kind, fall back to kind.
  const rawType = typeof manifest.type === 'string' ? manifest.type.trim().toLowerCase() : '';
  const type =
    rawType && rawType !== 'block' && rawType !== 'system' ? rawType : kind;

  const styles = Array.isArray(manifest.styles)
    ? manifest.styles.filter(
        (style): style is string => typeof style === 'string' && isSafeRelativePath(style)
      )
    : [];

  if (kind === 'block') {
    const entryPoint =
      typeof manifest.entryPoint === 'string' && manifest.entryPoint.trim()
        ? manifest.entryPoint.trim()
        : 'index.js';

    if (!isSafeRelativePath(entryPoint)) {
      throw new Error('manifest.json "entryPoint" must be a safe relative path');
    }

    return { kind, type, entryPoint, styles };
  }

  // --- system ---
  let adminEntry =
    typeof manifest.adminEntry === 'string' && manifest.adminEntry.trim()
      ? manifest.adminEntry.trim()
      : undefined;

  if (adminEntry && !isSafeRelativePath(adminEntry)) {
    throw new Error('manifest.json "adminEntry" must be a safe relative path');
  }

  if (!adminEntry) {
    if (pathExists(relativePaths, 'admin/index.html')) adminEntry = 'admin/index.html';
    else if (pathExists(relativePaths, 'dashboard/index.html')) adminEntry = 'dashboard/index.html';
  }

  if (!adminEntry) {
    throw new Error(
      'System plugin requires admin/index.html (or dashboard/index.html, or manifest.adminEntry)'
    );
  }

  let blockEntry =
    typeof manifest.blockEntry === 'string' && manifest.blockEntry.trim()
      ? manifest.blockEntry.trim()
      : undefined;

  if (blockEntry && !isSafeRelativePath(blockEntry)) {
    throw new Error('manifest.json "blockEntry" must be a safe relative path');
  }

  if (!blockEntry) {
    if (pathExists(relativePaths, 'block/index.js')) {
      blockEntry = 'block/index.js';
    } else if (
      typeof manifest.entryPoint === 'string' &&
      manifest.entryPoint.trim() &&
      isSafeRelativePath(manifest.entryPoint.trim()) &&
      pathExists(relativePaths, manifest.entryPoint.trim())
    ) {
      // Root entryPoint alongside admin/ → optional placeable block
      blockEntry = manifest.entryPoint.trim();
    }
  }

  return {
    kind,
    type,
    adminEntry,
    blockEntry,
    entryPoint: blockEntry,
    styles,
  };
}

export function parsePluginManifest(raw: unknown): ParsedPluginManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('manifest.json must be a JSON object');
  }

  const manifest = raw as PluginManifest;
  const name = typeof manifest.name === 'string' ? manifest.name.trim() : '';
  const version = typeof manifest.version === 'string' ? manifest.version.trim() : '';

  if (!name) throw new Error('manifest.json requires a non-empty "name"');
  if (!version) throw new Error('manifest.json requires a non-empty "version"');

  const pluginId = sanitizePluginId(
    typeof manifest.id === 'string' && manifest.id.trim() ? manifest.id : name
  );

  if (!PLUGIN_ID_PATTERN.test(pluginId)) {
    throw new Error(
      'manifest.json "id" must be 3-64 characters and use lowercase letters, numbers, hyphens, or underscores'
    );
  }

  const entryPoint =
    typeof manifest.entryPoint === 'string' && manifest.entryPoint.trim()
      ? manifest.entryPoint.trim()
      : undefined;

  if (entryPoint && !isSafeRelativePath(entryPoint)) {
    throw new Error('manifest.json "entryPoint" must be a safe relative path');
  }

  const adminEntry =
    typeof manifest.adminEntry === 'string' && manifest.adminEntry.trim()
      ? manifest.adminEntry.trim()
      : undefined;

  if (adminEntry && !isSafeRelativePath(adminEntry)) {
    throw new Error('manifest.json "adminEntry" must be a safe relative path');
  }

  const blockEntry =
    typeof manifest.blockEntry === 'string' && manifest.blockEntry.trim()
      ? manifest.blockEntry.trim()
      : undefined;

  if (blockEntry && !isSafeRelativePath(blockEntry)) {
    throw new Error('manifest.json "blockEntry" must be a safe relative path');
  }

  const styles = Array.isArray(manifest.styles)
    ? manifest.styles.filter(
        (style): style is string => typeof style === 'string' && isSafeRelativePath(style)
      )
    : [];

  if (manifest.customElement && typeof manifest.customElement !== 'string') {
    throw new Error('manifest.json "customElement" must be a string when provided');
  }

  const kind = asPluginKind(manifest.kind) ?? asPluginKind(manifest.type) ?? undefined;

  return {
    ...manifest,
    pluginId,
    name,
    version,
    description: typeof manifest.description === 'string' ? manifest.description : '',
    author: typeof manifest.author === 'string' ? manifest.author : 'Unknown',
    type: typeof manifest.type === 'string' ? manifest.type : undefined,
    kind,
    icon: typeof manifest.icon === 'string' ? manifest.icon : '🧩',
    entryPoint,
    adminEntry,
    blockEntry,
    styles,
    customElement: manifest.customElement?.trim() || undefined,
  };
}
