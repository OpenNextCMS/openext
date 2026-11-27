import { parseAdminNav } from '@/lib/plugins/adminNav';
import { PLUGIN_UI_DIR } from '@/lib/plugins/pluginLayout';
import type { PluginAdminNavItem } from '@/types/index';

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
  /**
   * @deprecated Dashboard display uses `adminMount`. Kept for optional static HTML assets only.
   */
  adminEntry?: string;
  /**
   * ESM module that exports `mount` / `unmount` for the dashboard plugin root (no iframe).
   * Required for system plugins. Path under `ui/` or `assets/` (`.js`, `.mjs`, or `.ts`).
   */
  adminMount?: string;
  /** Optional multi-page sidebar navigation for system plugin admin UIs. */
  adminNav?: PluginAdminNavItem[];
  /** Optional canvas block entry for system plugins that also ship a placeable block. */
  blockEntry?: string;
  styles?: string[];
  customElement?: string;
  /** Backend plugin entry (relative to plugins/{id}/). */
  serverEntry?: string;
  /** Migration directories relative to plugin root. */
  migrations?: string[];
  /** Model directories relative to plugin root. */
  models?: string[];
  /** Permissions declared by the plugin manifest. */
  permissions?: string[];
  /**
   * @deprecated Prefer `api/roles.js` (or `api/roles.ts`) in the plugin package.
   * Manifest userTypes are still accepted as a legacy fallback during upload.
   */
  userTypes?: Array<{
    id?: string;
    name: string;
    /** @deprecated Values are assigned automatically — do not set in manifests. */
    value?: number;
    baseRole?: number;
    permissions?: string[];
  }>;
  installHook?: string;
  uninstallHook?: string;
  dependencies?: string[];
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
  adminMount?: string;
  blockEntry?: string;
  styles: string[];
}

/** Script extensions accepted for dashboard mount modules (after TS compile: .js). */
export const ADMIN_MOUNT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

export function isAdminMountPath(filePath: string): boolean {
  if (!isSafeRelativePath(filePath)) return false;
  const underUiOrAssets =
    filePath.startsWith(`${PLUGIN_UI_DIR}/`) || filePath.startsWith('assets/');
  const legacyAdmin = filePath.startsWith('admin/');
  if (!underUiOrAssets && !legacyAdmin) return false;
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false;
  return ADMIN_MOUNT_EXTENSIONS.has(lower.slice(dot));
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
  if (manifest.adminMount && isAdminMountPath(manifest.adminMount.trim())) return true;
  if (manifest.adminEntry && isSafeRelativePath(manifest.adminEntry.trim())) return true;
  return relativePaths.some(
    (filePath) =>
      isAdminMountPath(filePath) ||
      filePath === `${PLUGIN_UI_DIR}/admin/mount.js` ||
      filePath === `${PLUGIN_UI_DIR}/admin/index.html` ||
      filePath.startsWith(`${PLUGIN_UI_DIR}/admin/`) ||
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
        : pathExists(relativePaths, `${PLUGIN_UI_DIR}/index.js`)
          ? `${PLUGIN_UI_DIR}/index.js`
          : pathExists(relativePaths, `${PLUGIN_UI_DIR}/block/index.js`)
            ? `${PLUGIN_UI_DIR}/block/index.js`
            : 'index.js';

    if (!isSafeRelativePath(entryPoint)) {
      throw new Error('manifest.json "entryPoint" must be a safe relative path');
    }

    return { kind, type, entryPoint, styles };
  }

  // --- system ---
  let adminMount =
    typeof manifest.adminMount === 'string' && manifest.adminMount.trim()
      ? manifest.adminMount.trim()
      : undefined;

  if (adminMount && !isAdminMountPath(adminMount)) {
    throw new Error(
      'manifest.json "adminMount" must be a .js/.mjs/.ts module under ui/ or assets/ (or admin/)'
    );
  }

  if (!adminMount) {
    const candidates = [
      `${PLUGIN_UI_DIR}/admin/mount.js`,
      `${PLUGIN_UI_DIR}/admin/mount.mjs`,
      `${PLUGIN_UI_DIR}/admin/mount.ts`,
      'admin/mount.js',
      'admin/mount.mjs',
      'assets/admin/mount.js',
    ];
    adminMount = candidates.find((candidate) => pathExists(relativePaths, candidate));
  }

  if (!adminMount) {
    throw new Error(
      `System plugin requires manifest.adminMount (ESM exporting mount/unmount), e.g. ${PLUGIN_UI_DIR}/admin/mount.js`
    );
  }

  // Optional deprecated HTML entry — stored if present, not used for dashboard display.
  let adminEntry =
    typeof manifest.adminEntry === 'string' && manifest.adminEntry.trim()
      ? manifest.adminEntry.trim()
      : undefined;

  if (adminEntry && !isSafeRelativePath(adminEntry)) {
    throw new Error('manifest.json "adminEntry" must be a safe relative path');
  }

  let blockEntry =
    typeof manifest.blockEntry === 'string' && manifest.blockEntry.trim()
      ? manifest.blockEntry.trim()
      : undefined;

  if (blockEntry && !isSafeRelativePath(blockEntry)) {
    throw new Error('manifest.json "blockEntry" must be a safe relative path');
  }

  if (!blockEntry) {
    if (pathExists(relativePaths, `${PLUGIN_UI_DIR}/block/index.js`)) {
      blockEntry = `${PLUGIN_UI_DIR}/block/index.js`;
    } else if (pathExists(relativePaths, 'block/index.js')) {
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
    adminMount,
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

  const adminMount =
    typeof manifest.adminMount === 'string' && manifest.adminMount.trim()
      ? manifest.adminMount.trim()
      : undefined;

  if (adminMount && !isAdminMountPath(adminMount)) {
    throw new Error(
      'manifest.json "adminMount" must be a .js/.mjs/.ts module under ui/ or assets/ (or admin/)'
    );
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

  const adminNav = parseAdminNav(manifest.adminNav);
  if (adminNav?.length) {
    for (const item of adminNav) {
      if (!isSafeRelativePath(item.entry)) {
        throw new Error(
          `manifest.json "adminNav" entry "${item.label}" has an unsafe "entry" path`
        );
      }
    }
  }

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
    adminMount,
    adminNav,
    blockEntry,
    styles,
    customElement: manifest.customElement?.trim() || undefined,
    serverEntry:
      typeof manifest.serverEntry === 'string' && manifest.serverEntry.trim()
        ? manifest.serverEntry.trim()
        : undefined,
    migrations: Array.isArray(manifest.migrations)
      ? manifest.migrations.filter((m): m is string => typeof m === 'string')
      : undefined,
    models: Array.isArray(manifest.models)
      ? manifest.models.filter((m): m is string => typeof m === 'string')
      : undefined,
    permissions: Array.isArray(manifest.permissions)
      ? manifest.permissions.filter((p): p is string => typeof p === 'string')
      : undefined,
    installHook:
      typeof manifest.installHook === 'string' && manifest.installHook.trim()
        ? manifest.installHook.trim()
        : undefined,
    uninstallHook:
      typeof manifest.uninstallHook === 'string' && manifest.uninstallHook.trim()
        ? manifest.uninstallHook.trim()
        : undefined,
    dependencies: Array.isArray(manifest.dependencies)
      ? manifest.dependencies.filter((d): d is string => typeof d === 'string')
      : undefined,
  };
}
