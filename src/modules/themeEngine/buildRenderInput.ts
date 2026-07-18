import { getPageDataForSlug } from '@/utils/getPageData';
import { getAuthUser } from '@/lib/api/auth';
import { resolveSiteSettings } from './bridges/settingsBridge';
import { resolveSiteMenu } from './bridges/menuBridge';
import { toCmsPage, toCmsBlocks } from './bridges/pageBridge';
import type { RenderInput } from './types';

/** Mirrors the seeded numeric Role values (`src/models/Role.ts`) — avoids an extra Mongo round trip just for a display label. */
const ROLE_LABELS: Record<string, string> = { '0': 'SuperAdmin', '1': 'Admin', '2': 'Editor', '3': 'Author' };

/**
 * Assembles a `RenderInput` for one page request — the ONE place that fans
 * out to every bridge (settings/menu/page/user) and hands the engine a
 * fully-formed, opaque input. `ThemeManager`/`ThemeRenderer`/`ThemeAPI` never
 * query Mongo themselves (spec §0) — this is where those reads actually
 * happen, all BEFORE `ThemeManager.renderPage()` is ever called.
 *
 * Returns `null` when there is no CMS page at this slug at all (a 404,
 * unrelated to theming) — matches `getPageDataForSlug`'s own contract.
 *
 * NOTE (flagged, not silently dropped): only navigation LINKS from the
 * header page's nav-bar block flow through (`menuBridge`). Any other
 * admin-built header/footer block content (a promo banner, a custom logo
 * block, etc.) does not — the active theme's own Header/Footer partials own
 * that chrome now. This is the deliberate, spec-driven design (confirmed
 * during the wiring step), not an oversight.
 */
export async function buildRenderInput(slug: string, previewThemeSlug?: string): Promise<RenderInput | null> {
  const pageData = await getPageDataForSlug(slug);
  if (!pageData) return null;

  const [settings, menuItems, authUser] = await Promise.all([
    resolveSiteSettings(),
    resolveSiteMenu(),
    getAuthUser(),
  ]);

  return {
    page: toCmsPage(pageData.metadata, slug),
    blocks: toCmsBlocks(pageData.blocks),
    menus: [{ key: 'primary', items: menuItems }],
    settings,
    previewThemeSlug,
    currentUser: authUser
      ? { id: authUser.userId, name: authUser.email || authUser.userId, role: ROLE_LABELS[String(authUser.role ?? '')] ?? String(authUser.role ?? '') }
      : null,
  };
}

/**
 * Build a RenderInput forced onto a specific theme for admin card / gallery
 * previews. Empty CMS blocks so ONLY the uploaded theme templates/partials
 * render — site settings + menu still feed the theme Header/Footer chrome.
 */
export async function buildCardPreviewInput(themeSlug: string): Promise<RenderInput> {
  const [settings, menuItems] = await Promise.all([
    resolveSiteSettings(),
    resolveSiteMenu(),
  ]);
  return {
    page: { id: 'card-preview', slug: 'home', title: 'Home', type: 'home' },
    blocks: [],
    menus: [{ key: 'primary', items: menuItems }],
    settings,
    previewThemeSlug: themeSlug,
    currentUser: null,
  };
}
