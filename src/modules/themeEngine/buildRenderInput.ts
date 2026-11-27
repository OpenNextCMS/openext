import { getPageDataForSlug } from '@/utils/getPageData';
import { getAuthUser } from '@/lib/api/auth';
import { resolveSiteSettings } from './bridges/settingsBridge';
import { resolveSiteMenu } from './bridges/menuBridge';
import { toCmsPage, toCmsBlocks } from './bridges/pageBridge';
import { getSiteLanguageConfig } from '@/lib/i18n/siteLocale';
import type { PageContentType, RenderInput } from './types';

/** Mirrors the seeded numeric Role values (`src/models/Role.ts`) — avoids an extra Mongo round trip just for a display label. */
const ROLE_LABELS: Record<string, string> = { '0': 'SuperAdmin', '1': 'Admin', '2': 'Editor', '3': 'Author' };

/**
 * Assembles a `RenderInput` for one page request — the ONE place that fans
 * out to every bridge (settings/menu/page/user) and hands the engine a
 * fully-formed, opaque input.
 */
export async function buildRenderInput(
  slug: string,
  previewThemeSlug?: string,
  locale?: string,
  options?: {
    strictLocale?: boolean;
    /** Skip a second DB load when the caller already fetched page data. */
    pageData?: Awaited<ReturnType<typeof getPageDataForSlug>>;
  }
): Promise<RenderInput | null> {
  const pageData =
    options?.pageData ?? (await getPageDataForSlug(slug, locale, options));
  if (!pageData) return null;

  const langConfig = await getSiteLanguageConfig();
  const activeLocale = locale || langConfig.defaultLanguage;

  const [settings, menuItems, authUser] = await Promise.all([
    resolveSiteSettings(),
    resolveSiteMenu(activeLocale, langConfig.defaultLanguage),
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

/** Map a template key/type to a page content type for gallery previews. */
function pageTypeForTemplate(templateKey?: string, templateType?: string): PageContentType {
  if (templateType === 'home' || templateKey === 'home') return 'home';
  if (templateType === 'search' || templateKey === 'search') return 'search';
  if (templateType === 'error' || templateKey === '404') return 'error';
  if (templateType === 'single' || templateKey === 'product' || templateKey === 'blogPost') return 'product';
  if (templateType === 'archive' || templateKey === 'products' || templateKey === 'blog' || templateKey === 'category')
    return 'archive';
  return 'page';
}

export interface CardPreviewOptions {
  templateKey?: string;
  templateType?: string;
  title?: string;
}

/**
 * Build a RenderInput forced onto a specific theme for admin card / gallery
 * previews. Empty CMS blocks so ONLY the uploaded theme templates/partials
 * render — site settings + menu still feed the theme Header/Footer chrome.
 */
export async function buildCardPreviewInput(
  themeSlug: string,
  options: CardPreviewOptions = {}
): Promise<RenderInput> {
  const [settings, menuItems] = await Promise.all([
    resolveSiteSettings(),
    resolveSiteMenu(),
  ]);
  const templateKey = options.templateKey?.trim() || undefined;
  const pageType = pageTypeForTemplate(templateKey, options.templateType);
  const title = options.title ?? (templateKey ? templateKey : 'Home');

  return {
    page: {
      id: 'card-preview',
      slug: templateKey ?? 'home',
      title,
      type: pageType,
      templateKey,
    },
    blocks: [],
    menus: [{ key: 'primary', items: menuItems }],
    settings,
    previewThemeSlug: themeSlug,
    currentUser: null,
    allowSectionDefaults: !templateKey || templateKey === 'home' || templateKey === 'index',
  };
}

/**
 * RenderInput for external marketplace / disk-only theme previews.
 * Uses the same empty-block preview shape as admin card previews.
 */
export async function buildMarketplacePreviewInput(themeSlug: string): Promise<RenderInput> {
  return buildCardPreviewInput(themeSlug);
}
