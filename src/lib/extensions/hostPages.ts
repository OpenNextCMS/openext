import { EXTENSION_ID_PATTERN } from '@/lib/extensions/constants';
import { isSafeRelativePath } from '@/lib/plugins/manifest';
import type { StoredExtension } from '@/lib/extensions/types';

/** First URL segment under a plugin runtime path that opens an extension page. */
export const EXTENSION_RUNTIME_SEGMENT = 'ext';

const PAGE_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}$/;

export interface ExtensionHostPage {
  extensionId: string;
  targetPluginId: string;
  id: string;
  label: string;
  entry: string;
}

interface PageSource {
  extensionId: string;
  targetPluginId: string;
  status: string;
  contributions?: {
    navigation?: Array<{ id?: string; label?: string; href?: string }>;
    pages?: Array<{ id?: string; title?: string; entry?: string }>;
  } | null;
  frontendEntry?: string;
}

const MOUNT_MODULE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

function isPublicEntry(relativePath: string): boolean {
  return (
    isSafeRelativePath(relativePath) &&
    (relativePath.startsWith('ui/') || relativePath.startsWith('assets/'))
  );
}

/** Dashboard mount modules (ESM exporting mount). HTML-only pages are not mounted. */
export function isMountModuleEntry(relativePath: string): boolean {
  if (!isPublicEntry(relativePath)) return false;
  const lower = relativePath.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false;
  return MOUNT_MODULE_EXTENSIONS.has(lower.slice(dot));
}

/** Public entry that the sidebar may list: mount modules only (no HTML iframe). */
function isDashboardPageEntry(relativePath: string): boolean {
  return isMountModuleEntry(relativePath);
}

function pageId(value: string | undefined): string | null {
  if (!value || !PAGE_ID_PATTERN.test(value)) return null;
  return value;
}

/**
 * Pages an enabled extension contributes to its target plugin.
 * Disabled, installed-only, and non-public paths are omitted so the plugin UI stays unchanged.
 */
export function extensionHostPages(source: PageSource): ExtensionHostPage[] {
  if (source.status !== 'enabled') return [];
  if (!EXTENSION_ID_PATTERN.test(source.extensionId)) return [];
  if (!EXTENSION_ID_PATTERN.test(source.targetPluginId)) return [];

  const navigation = source.contributions?.navigation ?? [];
  const labelById = new Map<string, string>();
  for (const item of navigation) {
    const id = pageId(item.id);
    const label = item.label?.trim();
    if (id && label) labelById.set(id, label);
  }

  const declared = source.contributions?.pages ?? [];
  const fromPages: ExtensionHostPage[] = [];
  for (const page of declared) {
    const id = pageId(page.id);
    const entry = page.entry?.trim() ?? '';
    const label = (id ? labelById.get(id) : undefined) || page.title?.trim();
    if (!id || !label || !isDashboardPageEntry(entry)) continue;
    fromPages.push({
      extensionId: source.extensionId,
      targetPluginId: source.targetPluginId,
      id,
      label,
      entry,
    });
  }
  if (fromPages.length > 0) return fromPages;

  const fromNavigation: ExtensionHostPage[] = [];
  for (const item of navigation) {
    const id = pageId(item.id);
    const entry = item.href?.trim() ?? '';
    const label = item.label?.trim();
    if (!id || !label || !isDashboardPageEntry(entry)) continue;
    fromNavigation.push({
      extensionId: source.extensionId,
      targetPluginId: source.targetPluginId,
      id,
      label,
      entry,
    });
  }
  if (fromNavigation.length > 0) return fromNavigation;

  const frontend = source.frontendEntry?.trim() ?? '';
  if (!isDashboardPageEntry(frontend)) return [];
  return [
    {
      extensionId: source.extensionId,
      targetPluginId: source.targetPluginId,
      id: 'home',
      label: 'Extension',
      entry: frontend,
    },
  ];
}

export function extensionHostPagesFromRecord(record: StoredExtension): ExtensionHostPage[] {
  return extensionHostPages({
    extensionId: record.extensionId,
    targetPluginId: record.targetPluginId,
    status: record.status,
    contributions: record.manifest.contributions,
    frontendEntry: record.manifest.entry?.frontend,
  });
}

/** Accepts the dashboard extensions list and keeps only safe, enabled pages. */
export function extensionHostPagesFromList(extensions: unknown): ExtensionHostPage[] {
  if (!Array.isArray(extensions)) return [];
  const pages: ExtensionHostPage[] = [];
  for (const item of extensions) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.extensionId !== 'string' || typeof row.targetPluginId !== 'string') continue;
    if (row.status !== 'enabled' || !Array.isArray(row.pages)) continue;
    pages.push(
      ...extensionHostPages({
        extensionId: row.extensionId,
        targetPluginId: row.targetPluginId,
        status: 'enabled',
        contributions: {
          pages: row.pages.flatMap((page) => {
            if (!page || typeof page !== 'object') return [];
            const entry = page as Record<string, unknown>;
            return [
              {
                id: typeof entry.id === 'string' ? entry.id : undefined,
                title: typeof entry.label === 'string' ? entry.label : undefined,
                entry: typeof entry.entry === 'string' ? entry.entry : undefined,
              },
            ];
          }),
        },
      })
    );
  }
  return pages;
}

export function runtimeExtensionPagePath(pluginId: string, extensionId: string, pageId: string): string {
  return `/dashboard/plugins/runtime/${encodeURIComponent(pluginId)}/${EXTENSION_RUNTIME_SEGMENT}/${encodeURIComponent(extensionId)}/${encodeURIComponent(pageId)}`;
}

/** Same-origin URL for the extension HTML. Served by the CMS, not inside the plugin app. */
export function extensionAssetPath(page: Pick<ExtensionHostPage, 'extensionId' | 'entry'>): string {
  const encodedEntry = page.entry.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `/extensions/${encodeURIComponent(page.extensionId)}/${encodedEntry}`;
}

export function extensionNavLinks(
  pluginId: string,
  pages: ExtensionHostPage[]
): Array<{ label: string; path: string }> {
  return pages
    .filter((page) => page.targetPluginId === pluginId)
    .map((page) => ({
      label: page.label,
      path: runtimeExtensionPagePath(pluginId, page.extensionId, page.id),
    }));
}
