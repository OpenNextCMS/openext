import { getPageDbConnection, getPageModel } from '@/utils/db';
import { getPluginState } from './lifecycle';
import { menuItemIdFor } from './menu-item-id';
import type { ResolvedHeader, HeaderResolutionFailure, MenuItem } from '@/types/menu-redirect';

// Re-export so existing imports from this module keep working.
export { menuItemIdFor };

/* eslint-disable @typescript-eslint/no-explicit-any */
interface NavLink {
  label?: string;
  href?: string;
  children?: NavLink[];
}

/** Depth-first search for the first nav-bar block within a page's component tree. */
function findNavbarBlock(blocks: any[]): any | null {
  if (!Array.isArray(blocks)) return null;
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'nav-bar') return b;
    if (Array.isArray(b.children)) {
      for (const col of b.children) {
        const found = findNavbarBlock(Array.isArray(col) ? col : []);
        if (found) return found;
      }
    }
  }
  return null;
}

function parseNavLinks(navbar: any): NavLink[] {
  try {
    const content = typeof navbar?.content === 'string' ? JSON.parse(navbar.content) : navbar?.content;
    const links = content?.links;
    return Array.isArray(links) ? (links as NavLink[]) : [];
  } catch {
    return [];
  }
}

function toMenuItems(links: NavLink[], parentId?: string): MenuItem[] {
  return links.map((l, i) => {
    const label = l.label || `Link ${i + 1}`;
    const id = menuItemIdFor(label, i, parentId);
    return {
      id,
      label,
      href: l.href,
      children: Array.isArray(l.children) ? toMenuItems(l.children, id) : undefined,
    };
  });
}

/**
 * Resolve the active header (the global header Page, or a specific one) into a
 * normalized { headerId, headerName, menuItems } shape for the plugin UI.
 * Returns a failure object (with a reason) when the plugin is inactive, no
 * header exists, or the header has no nav-bar — degrading gracefully.
 */
export async function resolveActiveHeader(
  opts: { headerId?: string } = {}
): Promise<ResolvedHeader | HeaderResolutionFailure> {
  // Defense-in-depth: no-op when the plugin isn't active.
  const state = await getPluginState();
  if (!state.installed || !state.enabled) {
    return { header: null, reason: 'plugin_inactive' };
  }

  try {
    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);

    let header = opts.headerId
      ? await Page.findOne({ _id: opts.headerId }).lean().exec()
      : await Page.findOne({ pageType: 'header', isGlobal: true }).lean().exec();
    if (!header && !opts.headerId) {
      header = await Page.findOne({ pageType: 'header' }).lean().exec();
    }
    if (!header) return { header: null, reason: 'no_header' };

    const navbar = findNavbarBlock((header as { component?: any[] }).component || []);
    if (!navbar) return { header: null, reason: 'no_navbar' };

    const links = parseNavLinks(navbar);
    const menuItems: MenuItem[] = toMenuItems(links);

    return {
      headerId: String((header as { _id: unknown })._id),
      headerName: (header as { pageName?: string }).pageName || 'Header',
      menuItems,
    };
  } catch {
    return { header: null, reason: 'error' };
  }
}
