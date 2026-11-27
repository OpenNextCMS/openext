import { ROLE, type RoleValue } from '@/lib/rbac/roles';
import type { PluginAdminNavItem } from '@/types/index';
import type { PluginUserTypeDraft } from '@/lib/rbac/pluginUserTypes';

function isCoreRoleValue(role: number): boolean {
  return Number.isFinite(role) && role >= ROLE.SUPER_ADMIN && role <= ROLE.AUTHOR;
}

/** One page this role may open, with optional feature keys on that page. */
export interface PluginRolePageAccess {
  /** Must match manifest.adminNav[].id (or pages[].id in roles file). */
  id: string;
  /**
   * Features allowed on this page.
   * - omit or ['*'] → all features on the page
   * - [] → page visible but no feature actions
   * - ['list','view'] → only those features
   */
  features?: string[] | '*';
}

/**
 * Official NextCMS `api/roles.js` / `api/roles.ts` shape.
 *
 * @example
 * module.exports = {
 *   pages: [
 *     { id: 'dashboard', label: 'Dashboard', features: ['view-stats'] },
 *     { id: 'customers', label: 'Customers', features: ['list', 'create', 'edit', 'delete'] },
 *   ],
 *   roles: [
 *     {
 *       id: 'crm-viewer',
 *       name: 'CRM Viewer',
 *       permissions: ['crm.read'],
 *       pages: [
 *         'dashboard',
 *         { id: 'customers', features: ['list'] },
 *       ],
 *     },
 *     {
 *       id: 'crm-manager',
 *       name: 'CRM Manager',
 *       permissions: ['crm.read', 'crm.write'],
 *       pages: ['*'],
 *     },
 *   ],
 * };
 */
export interface PluginRolesFile {
  /** Optional catalog of pages/features (for validation). Prefer matching adminNav ids. */
  pages?: Array<{
    id: string;
    label?: string;
    features?: string[];
  }>;
  roles: PluginRoleDefinitionInput[];
}

export interface PluginRoleDefinitionInput {
  id?: string;
  name: string;
  /** Defaults to Author (3). Editor (2) allowed; SuperAdmin not allowed. */
  baseRole?: number;
  /** API permissions — must be listed in manifest.permissions */
  permissions: string[];
  /**
   * Which plugin pages this role can open.
   * - omit → all adminNav pages (all features)
   * - ['*'] → all pages / all features
   * - ['dashboard', { id: 'customers', features: ['list'] }]
   */
  pages?: Array<string | PluginRolePageAccess> | '*';
}

export interface ParsedPluginPageAccess {
  id: string;
  /** '*' means every feature on the page */
  features: string[] | '*';
}

function slugifyRoleId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function unwrapRolesFile(mod: unknown): { pagesCatalog: PluginRolesFile['pages']; rolesRaw: unknown } {
  if (!mod || typeof mod !== 'object') {
    return { pagesCatalog: undefined, rolesRaw: null };
  }

  const obj = mod as Record<string, unknown>;
  const root =
    Array.isArray(mod)
      ? { roles: mod }
      : Array.isArray(obj.default)
        ? { roles: obj.default, pages: undefined }
        : obj.default && typeof obj.default === 'object'
          ? (obj.default as Record<string, unknown>)
          : obj;

  const pagesCatalog = Array.isArray(root.pages)
    ? (root.pages as PluginRolesFile['pages'])
    : undefined;

  if (Array.isArray(root.roles)) {
    return { pagesCatalog, rolesRaw: root.roles };
  }
  if (Array.isArray(root)) {
    return { pagesCatalog, rolesRaw: root };
  }

  return { pagesCatalog, rolesRaw: null };
}

function normalizePageAccessEntry(
  entry: string | PluginRolePageAccess,
  roleName: string,
  sourceLabel: string
): ParsedPluginPageAccess {
  if (typeof entry === 'string') {
    const id = entry.trim();
    if (!id) {
      throw new Error(`${sourceLabel} role "${roleName}" has an empty page id`);
    }
    if (id === '*') {
      return { id: '*', features: '*' };
    }
    return { id, features: '*' };
  }

  if (!entry || typeof entry !== 'object') {
    throw new Error(`${sourceLabel} role "${roleName}" pages entries must be strings or objects`);
  }

  const id = String(entry.id || '').trim();
  if (!id) {
    throw new Error(`${sourceLabel} role "${roleName}" page entry is missing "id"`);
  }

  if (entry.features === '*' || entry.features === undefined) {
    return { id, features: '*' };
  }

  if (!Array.isArray(entry.features)) {
    throw new Error(
      `${sourceLabel} role "${roleName}" page "${id}" features must be an array or "*"`
    );
  }

  const features = entry.features
    .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    .map((f) => f.trim());

  return { id, features };
}

/**
 * Parse and validate the official api/roles.js format.
 * Also accepts a legacy bare array of roles (no pages/features).
 */
export function parsePluginRolesFile(
  pluginId: string,
  rawModule: unknown,
  manifestPermissions: string[],
  adminNav: PluginAdminNavItem[] | undefined,
  sourceLabel = 'api/roles.js'
): PluginUserTypeDraft[] {
  const { pagesCatalog, rolesRaw } = unwrapRolesFile(rawModule);
  if (!Array.isArray(rolesRaw) || rolesRaw.length === 0) {
    throw new Error(
      `${sourceLabel} must export { roles: [...] } or an array of role objects`
    );
  }

  const permissionSet = new Set(manifestPermissions);
  const adminNavIds = new Set((adminNav || []).map((item) => item.id));
  const catalogById = new Map(
    (pagesCatalog || []).map((page) => [String(page.id).trim(), page])
  );

  // Known page ids = adminNav ∪ roles-file pages catalog
  const knownPageIds = new Set<string>([...adminNavIds, ...catalogById.keys()]);

  const seenIds = new Set<string>();
  const out: PluginUserTypeDraft[] = [];

  for (const item of rolesRaw) {
    if (!item || typeof item !== 'object') {
      throw new Error(`${sourceLabel} role entries must be objects`);
    }
    const obj = item as Record<string, unknown>;
    const name = String(obj.name || '').trim();
    if (!name) {
      throw new Error(`${sourceLabel} role entry is missing "name"`);
    }

    const idRaw =
      typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : slugifyRoleId(name);
    const id = idRaw || slugifyRoleId(`${pluginId}-role`);
    if (seenIds.has(id)) {
      throw new Error(`${sourceLabel} has duplicate role id "${id}"`);
    }
    seenIds.add(id);

    const baseRoleRaw = obj.baseRole;
    const baseRole =
      baseRoleRaw === undefined || baseRoleRaw === null
        ? ROLE.AUTHOR
        : typeof baseRoleRaw === 'number'
          ? baseRoleRaw
          : parseInt(String(baseRoleRaw), 10);
    if (!isCoreRoleValue(baseRole) || baseRole === ROLE.SUPER_ADMIN) {
      throw new Error(
        `${sourceLabel} role "${name}" has invalid baseRole (use Author=3 or Editor=2)`
      );
    }

    const permissions = Array.isArray(obj.permissions)
      ? obj.permissions.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];
    if (permissions.length === 0) {
      throw new Error(
        `${sourceLabel} role "${name}" must list at least one permission in "permissions"`
      );
    }
    for (const perm of permissions) {
      if (!permissionSet.has(perm)) {
        throw new Error(
          `${sourceLabel} role "${name}" references unknown permission "${perm}" (declare it in manifest.permissions)`
        );
      }
    }

    let pageAccess: ParsedPluginPageAccess[] | undefined;

    if (obj.pages === '*' || obj.pages === undefined) {
      // All pages / all features (or single-page plugins with no adminNav)
      pageAccess = [{ id: '*', features: '*' }];
    } else if (Array.isArray(obj.pages)) {
      if (obj.pages.length === 0) {
        throw new Error(
          `${sourceLabel} role "${name}" pages array is empty — use ["*"] for all pages or list page ids`
        );
      }
      pageAccess = obj.pages.map((entry) =>
        normalizePageAccessEntry(entry as string | PluginRolePageAccess, name, sourceLabel)
      );

      if (pageAccess.some((p) => p.id === '*')) {
        pageAccess = [{ id: '*', features: '*' }];
      } else {
        for (const page of pageAccess) {
          if (knownPageIds.size > 0 && !knownPageIds.has(page.id)) {
            throw new Error(
              `${sourceLabel} role "${name}" references unknown page "${page.id}". ` +
                `Use an adminNav id${catalogById.size ? ' or a pages[].id from roles.js' : ''}.`
            );
          }

          const catalog = catalogById.get(page.id);
          if (catalog?.features?.length && Array.isArray(page.features)) {
            for (const feature of page.features) {
              if (!catalog.features.includes(feature)) {
                throw new Error(
                  `${sourceLabel} role "${name}" page "${page.id}" references unknown feature "${feature}"`
                );
              }
            }
          }
        }
      }
    } else {
      throw new Error(
        `${sourceLabel} role "${name}" pages must be "*", an array of page ids/objects, or omitted`
      );
    }

    out.push({
      pluginId,
      id,
      name,
      baseRole: baseRole as RoleValue,
      permissions,
      pageAccess,
    });
  }

  return out;
}

export function roleCanAccessPluginPage(
  pageAccess: ParsedPluginPageAccess[] | undefined,
  pageId: string | undefined
): boolean {
  if (!pageAccess || pageAccess.some((p) => p.id === '*')) return true;
  if (!pageId) {
    // Default/landing page with no nav id — allow if any page access exists
    return pageAccess.length > 0;
  }
  return pageAccess.some((p) => p.id === pageId);
}

export function roleFeaturesForPluginPage(
  pageAccess: ParsedPluginPageAccess[] | undefined,
  pageId: string | undefined
): string[] | '*' {
  if (!pageAccess || pageAccess.some((p) => p.id === '*')) return '*';
  if (!pageId) {
    // Single-page / default entry: use the only declared page's features when unambiguous
    if (pageAccess.length === 1) return pageAccess[0].features;
    return '*';
  }
  const match = pageAccess.find((p) => p.id === pageId);
  if (!match) return [];
  return match.features;
}

export function filterAdminNavForRole(
  adminNav: PluginAdminNavItem[] | undefined,
  pageAccess: ParsedPluginPageAccess[] | undefined
): PluginAdminNavItem[] {
  if (!adminNav?.length) return [];
  if (!pageAccess || pageAccess.some((p) => p.id === '*')) return [...adminNav];
  const allowed = new Set(pageAccess.map((p) => p.id));
  return adminNav.filter((item) => allowed.has(item.id));
}

/** Feature picker catalog for Roles UI (pages + features + API permissions). */
export interface PluginFeatureCatalogFeature {
  id: string;
  label: string;
}

export interface PluginFeatureCatalogPage {
  id: string;
  label: string;
  features: PluginFeatureCatalogFeature[];
}

export interface PluginFeatureCatalog {
  pages: PluginFeatureCatalogPage[];
  permissions: PluginFeatureCatalogFeature[];
}

function humanizeFeatureId(id: string): string {
  return id
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Build the catalog shown when a custom role is allowed to use a plugin.
 * Prefer roles.js `pages` catalog; fall back to adminNav; always include permissions.
 */
export function buildPluginFeatureCatalog(options: {
  pagesCatalog?: PluginRolesFile['pages'];
  adminNav?: PluginAdminNavItem[];
  permissions?: string[];
}): PluginFeatureCatalog {
  const permissions = (options.permissions || [])
    .filter((p) => typeof p === 'string' && p.trim())
    .map((id) => ({ id: id.trim(), label: humanizeFeatureId(id.trim()) }));

  const pages: PluginFeatureCatalogPage[] = [];
  const seen = new Set<string>();

  for (const page of options.pagesCatalog || []) {
    const id = String(page.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const features = (page.features || [])
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      .map((f) => f.trim());
    pages.push({
      id,
      label: String(page.label || '').trim() || humanizeFeatureId(id),
      features: features.map((fid) => ({ id: fid, label: humanizeFeatureId(fid) })),
    });
  }

  for (const nav of options.adminNav || []) {
    const id = String(nav.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    pages.push({
      id,
      label: String(nav.label || '').trim() || humanizeFeatureId(id),
      features: [],
    });
  }

  return { pages, permissions };
}

/** Read optional `pages` catalog from a roles.js module without validating roles. */
export function peekRolesPagesCatalog(rawModule: unknown): PluginRolesFile['pages'] {
  const { pagesCatalog } = unwrapRolesFile(rawModule);
  return pagesCatalog;
}

// Re-export for callers that want the constant near the schema
export { ROLE };
