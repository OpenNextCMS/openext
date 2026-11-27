import type { PluginAdminNavItem } from '@/types/index';

const NAV_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}[a-z0-9]?$/;

export function slugifyAdminNavId(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'page';
}

export function runtimePluginPath(pluginId: string, navId?: string): string {
  const base = `/dashboard/plugins/runtime/${encodeURIComponent(pluginId)}`;
  return navId ? `${base}/${encodeURIComponent(navId)}` : base;
}

export function resolveAdminNavEntry(
  adminEntry: string | undefined,
  adminNav: PluginAdminNavItem[] | undefined,
  navId?: string
): string {
  if (navId && adminNav?.length) {
    const match = adminNav.find((item) => item.id === navId);
    if (match?.entry) return match.entry;
  }
  return adminEntry || '';
}

/** True when an adminNav/adminMount entry is a JS/TS module (not legacy HTML). */
export function isMountModulePath(entry: string | undefined): boolean {
  if (!entry) return false;
  const path = entry.trim().split('?')[0].split('#')[0].toLowerCase();
  return /\.(m?js|cjs|tsx?)$/.test(path);
}

/**
 * Resolve the ESM module URL/path for the dashboard mount root.
 * Prefer a per-page adminNav mount entry when present; otherwise shared adminMount.
 * Legacy HTML adminNav entries are ignored so the shared adminMount + pageId still work.
 */
export function resolveAdminMountModule(
  adminMount: string | undefined,
  adminNav: PluginAdminNavItem[] | undefined,
  navId?: string
): string {
  if (navId && adminNav?.length) {
    const match = adminNav.find((item) => item.id === navId);
    if (match?.entry && isMountModulePath(match.entry)) return match.entry;
  }
  if (adminMount && isMountModulePath(adminMount)) return adminMount;
  return adminMount || '';
}

export function parseAdminNav(raw: unknown): PluginAdminNavItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const seenIds = new Set<string>();
  const items: PluginAdminNavItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('manifest.json "adminNav" entries must be objects');
    }

    const item = entry as Record<string, unknown>;
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    const entryPath = typeof item.entry === 'string' ? item.entry.trim() : '';

    if (!label) {
      throw new Error('manifest.json "adminNav" entries require a non-empty "label"');
    }
    if (!entryPath) {
      throw new Error(`manifest.json "adminNav" entry "${label}" requires a non-empty "entry"`);
    }

    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().toLowerCase()
        : slugifyAdminNavId(label);

    if (!NAV_ID_PATTERN.test(id)) {
      throw new Error(
        `manifest.json "adminNav" id "${id}" must use lowercase letters, numbers, hyphens, or underscores`
      );
    }
    if (seenIds.has(id)) {
      throw new Error(`manifest.json "adminNav" contains duplicate id "${id}"`);
    }
    seenIds.add(id);

    const icon = typeof item.icon === 'string' && item.icon.trim() ? item.icon.trim() : undefined;

    items.push({ id, label, entry: entryPath, icon });
  }

  return items;
}
