import { getPageDbConnection, getPageModel, getMenuRedirectMappingModel } from '@/utils/db';
import { menuItemIdFor } from '@/lib/menu-redirect/menu-item-id';
import { getPluginState } from '@/lib/menu-redirect/lifecycle';
import { DEFAULT_SITE_LOCALE, withLocalePrefix } from '@/lib/i18n/siteLanguages';
import type { CmsMenuItem } from '../types';

/**
 * `menu()`/`navigation()` bridge (spec §4.11).
 *
 * There is no standalone Menu collection in this CMS — navigation lives as
 * JSON inside a `nav-bar`-typed block's `content` on the global header Page
 * doc. This bridge parses that, then layers Menu Redirect overrides on top.
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

function localizeHref(href: string, locale: string, defaultLocale: string): string {
  if (!href || href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
    return href;
  }
  // Already prefixed with a locale segment like /hi/about
  const parts = href.split('/').filter(Boolean);
  if (parts[0] && parts[0] === locale) return href.startsWith('/') ? href : `/${href}`;
  const path = href.startsWith('/') ? href : `/${href}`;
  return withLocalePrefix(path, locale, defaultLocale);
}

function toMenuItems(
  links: RawNavLink[],
  locale: string,
  defaultLocale: string,
  parentId?: string
): CmsMenuItem[] {
  return links.map((l, i) => {
    const label = l.label || `Link ${i + 1}`;
    const id = menuItemIdFor(label, i, parentId);
    const raw = l.href || '#';
    return {
      id,
      label,
      url: localizeHref(raw, locale, defaultLocale),
      children:
        Array.isArray(l.children) && l.children.length > 0
          ? toMenuItems(l.children, locale, defaultLocale, id)
          : undefined,
    };
  });
}

interface Override {
  targetUrl?: string;
  enabled?: boolean;
}

function applyOverrides(
  items: CmsMenuItem[],
  overrides: Map<string, Override>,
  locale: string,
  defaultLocale: string
): CmsMenuItem[] {
  return items
    .filter((item) => overrides.get(item.id)?.enabled !== false)
    .map((item) => {
      const o = overrides.get(item.id);
      const url = o?.targetUrl ? localizeHref(o.targetUrl, locale, defaultLocale) : item.url;
      return {
        ...item,
        url,
        children: item.children
          ? applyOverrides(item.children, overrides, locale, defaultLocale)
          : undefined,
      };
    });
}

export async function resolveSiteMenu(
  locale: string = DEFAULT_SITE_LOCALE,
  defaultLocale: string = DEFAULT_SITE_LOCALE
): Promise<CmsMenuItem[]> {
  const pageDb = await getPageDbConnection();
  const Page = getPageModel(pageDb);
  const preferred = locale || defaultLocale || DEFAULT_SITE_LOCALE;

  const header =
    (await Page.findOne({
      pageType: 'header',
      isGlobal: true,
      isPublished: true,
      locale: preferred,
    })
      .lean()
      .exec()) ??
    (await Page.findOne({ pageType: 'header', isPublished: true, locale: preferred }).lean().exec()) ??
    (preferred === defaultLocale
      ? (await Page.findOne({ pageType: 'header', isGlobal: true, isPublished: true }).lean().exec()) ??
        (await Page.findOne({ pageType: 'header', isPublished: true }).lean().exec())
      : null);

  if (!header) return [];

  const navbar = findNavbarBlock((header as { component?: unknown[] }).component || []);
  const items = toMenuItems(parseNavLinks(navbar), preferred, defaultLocale);
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
    return applyOverrides(items, overrides, preferred, defaultLocale);
  } catch {
    return items;
  }
}
