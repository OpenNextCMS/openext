import { getPageDbConnection, getPageModel, getMenuRedirectMappingModel } from '@/utils/db';
import { menuItemIdFor } from '@/lib/menu-redirect/menu-item-id';
import { getPluginState } from '@/lib/menu-redirect/lifecycle';
import type { CmsMenuItem } from '../types';

/**
 * `menu()`/`navigation()` bridge (spec §4.11).
 *
 * There is no standalone Menu collection in this CMS — navigation lives as
 * JSON inside a `nav-bar`-typed block's `content` on the global header Page
 * doc. This bridge parses that (deliberately NOT via
 * `@/lib/menu-redirect/header-detection`'s `resolveActiveHeader`, even though
 * its parsing logic is nearly identical: that function is gated entirely
 * behind the Menu Redirect PLUGIN being installed+active, since it exists to
 * serve that plugin's own admin UI. The base site menu must be readable
 * whether or not that plugin is installed — only the redirect OVERRIDES
 * layered on top are plugin-gated), then layers Menu Redirect overrides on
 * top the same way `/api/menu-redirect/public/merged` does, best-effort.
 *
 * v1 LIMITATION, documented rather than silently absorbed: every
 * manifest-declared `menus[].key` resolves to this SAME single nav-bar-
 * derived list — the CMS has no per-key menu storage yet.
 */

interface RawNavLink {
  label?: string;
  href?: string;
  children?: RawNavLink[];
}

function findNavbarBlock(blocks: unknown[]): { content?: unknown } | null {
  if (!Array.isArray(blocks)) return null;
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    const block = b as { type?: string; content?: unknown; children?: unknown[] };
    if (block.type === 'nav-bar') return block;
    if (Array.isArray(block.children)) {
      for (const col of block.children) {
        const found = findNavbarBlock(Array.isArray(col) ? col : []);
        if (found) return found;
      }
    }
  }
  return null;
}

function parseNavLinks(navbar: { content?: unknown } | null): RawNavLink[] {
  try {
    const content = typeof navbar?.content === 'string' ? JSON.parse(navbar.content) : navbar?.content;
    const links = (content as { links?: unknown } | undefined)?.links;
    return Array.isArray(links) ? (links as RawNavLink[]) : [];
  } catch {
    return [];
  }
}

function toMenuItems(links: RawNavLink[], parentId?: string): CmsMenuItem[] {
  return links.map((l, i) => {
    const label = l.label || `Link ${i + 1}`;
    const id = menuItemIdFor(label, i, parentId);
    return {
      id,
      label,
      url: l.href || '#',
      children: Array.isArray(l.children) && l.children.length > 0 ? toMenuItems(l.children, id) : undefined,
    };
  });
}

interface Override {
  targetUrl?: string;
  enabled?: boolean;
}

function applyOverrides(items: CmsMenuItem[], overrides: Map<string, Override>): CmsMenuItem[] {
  return items
    .filter((item) => overrides.get(item.id)?.enabled !== false) // an explicit disabled override hides the item
    .map((item) => {
      const o = overrides.get(item.id);
      return {
        ...item,
        url: o?.targetUrl || item.url,
        children: item.children ? applyOverrides(item.children, overrides) : undefined,
      };
    });
}

export async function resolveSiteMenu(): Promise<CmsMenuItem[]> {
  const pageDb = await getPageDbConnection();
  const Page = getPageModel(pageDb);

  const header =
    (await Page.findOne({ pageType: 'header', isGlobal: true }).lean().exec()) ??
    (await Page.findOne({ pageType: 'header' }).lean().exec());
  if (!header) return [];

  const navbar = findNavbarBlock((header as { component?: unknown[] }).component || []);
  const items = toMenuItems(parseNavLinks(navbar));
  if (items.length === 0) return items;

  try {
    const state = await getPluginState();
    if (!state.installed || !state.enabled) return items;

    const Mapping = getMenuRedirectMappingModel(pageDb);
    const headerId = String((header as { _id: unknown })._id);
    const mappings = await Mapping.find({ headerId }).lean().exec();
    const overrides = new Map<string, Override>(
      mappings.map((m) => {
        const mapping = m as unknown as { menuItemId: string; targetUrl?: string; enabled?: boolean };
        return [mapping.menuItemId, { targetUrl: mapping.targetUrl, enabled: mapping.enabled }];
      })
    );
    return applyOverrides(items, overrides);
  } catch {
    // The redirect overlay is best-effort — a failure here must never break the base menu.
    return items;
  }
}
