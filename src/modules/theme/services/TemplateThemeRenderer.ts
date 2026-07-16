import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { getPageDbConnection, getPageModel, getThemeModel } from '@/utils/db';
import { getThemeDirectory } from '../utils/storage';
import { isPathInside, isSafeRelativePath } from '../utils/pathSafety';
import { THEME_ASSETS_PUBLIC_PREFIX } from '../constants';
import type { ITheme } from '@/types/theme';

/**
 * TemplateThemeRenderer — WordPress-style rendering for "template" themes.
 *
 * A template theme ships its own HTML files (index.html, about.html, post.html …)
 * plus CSS/JS/image assets. When such a theme is active, the public site is served
 * from those HTML files verbatim — Next.js plays the role PHP plays in WordPress:
 *   1. pick the template file for the requested path (template hierarchy),
 *   2. rewrite relative asset URLs → /theme-assets/{slug}/… (served safely),
 *   3. rewrite internal *.html links → the site render route,
 *   4. fill WordPress-style tags ({{site_title}}, {{menu}}, {{content}}, posts loop),
 *   5. return the exact HTML document.
 */

export interface RenderResult {
  html: string;
  status: number;
}

interface ActiveTemplateTheme {
  slug: string;
  name: string;
  htmlTemplates: string[];
}

const SITE_RENDER_ROUTE = '/api/site/render';

/** Is a URL "relative" (points inside the package) rather than external/anchor? */
function isRelativeUrl(url: string): boolean {
  if (!url) return false;
  return !/^(?:[a-z]+:|\/\/|\/|#|data:|mailto:|tel:|javascript:)/i.test(url);
}

/** Turn "about.html" → "about", "index.html"/"" → "" (home). */
function htmlToPath(href: string): string {
  const base = href.split(/[?#]/)[0].split('/').pop() || '';
  const name = base.replace(/\.html?$/i, '');
  return name === 'index' || name === 'home' ? '' : name;
}

export const TemplateThemeRenderer = {
  /** The active theme if (and only if) it is a WordPress-style template theme. */
  async getActive(): Promise<ActiveTemplateTheme | null> {
    try {
      const pageDb = await getPageDbConnection();
      const Theme = getThemeModel(pageDb);
      const doc = (await Theme.findOne({ isActive: true }).lean().exec()) as
        | (ITheme & { meta?: Record<string, unknown> })
        | null;
      if (!doc) return null;
      const meta = (doc.meta || {}) as { renderer?: string; htmlTemplates?: string[] };
      if (meta.renderer !== 'template') return null;
      return {
        slug: doc.slug,
        name: doc.name,
        htmlTemplates: Array.isArray(meta.htmlTemplates) ? meta.htmlTemplates : [],
      };
    } catch {
      return null;
    }
  },

  /**
   * WordPress-like template hierarchy: resolve a request path to an HTML file
   * that actually exists in the theme.
   *   ""/"home"     → index.html
   *   "about"       → about.html → page.html → index.html
   *   "blog/x" post → post.html → single.html → page.html → index.html
   *   (404)         → 404.html → index.html
   */
  resolveTemplate(pagePath: string, templates: string[], opts?: { isPost?: boolean; is404?: boolean }): string | null {
    const has = (f: string) => templates.some((t) => t.toLowerCase() === f.toLowerCase());
    const first = (...cands: string[]) => cands.find(has) || null;

    if (opts?.is404) return first('404.html', 'index.html');
    const clean = (pagePath || '').replace(/^\/+|\/+$/g, '');
    if (!clean || clean === 'home' || clean === 'index') return first('index.html', 'home.html');
    if (opts?.isPost) return first('post.html', 'single.html', 'page.html', 'index.html');
    // exact file match first (about → about.html), then generic page template
    return first(`${clean.split('/').pop()}.html`, `${clean}.html`, 'page.html', 'index.html');
  },

  /** Read a template file safely from storage/themes/{slug}/. */
  async readTemplate(slug: string, relPath: string): Promise<string | null> {
    if (!isSafeRelativePath(relPath)) return null;
    const root = getThemeDirectory(slug);
    const abs = path.join(root, relPath);
    if (!isPathInside(root, abs)) return null;
    try {
      return await fs.readFile(abs, 'utf8');
    } catch {
      return null;
    }
  },

  /** Rewrite href/src/poster + CSS url() so assets load and page links navigate. */
  rewriteUrls(html: string, slug: string): string {
    const $ = cheerio.load(html);
    const base = `${THEME_ASSETS_PUBLIC_PREFIX}/${slug}`;

    const rewriteAttr = ($el: ReturnType<typeof $>, attr: string) => {
      const val = $el.attr(attr);
      if (!val || !isRelativeUrl(val)) return;
      if (/\.html?(?:[?#]|$)/i.test(val)) {
        // internal page link → site render route (WordPress permalinks)
        const p = htmlToPath(val);
        $el.attr(attr, p ? `${SITE_RENDER_ROUTE}?path=${encodeURIComponent(p)}` : SITE_RENDER_ROUTE);
      } else {
        // asset → theme-assets pipeline
        $el.attr(attr, `${base}/${val.replace(/^\.?\//, '')}`);
      }
    };

    $('[href]').each((_, el) => rewriteAttr($(el), 'href'));
    $('[src]').each((_, el) => rewriteAttr($(el), 'src'));
    $('[poster]').each((_, el) => rewriteAttr($(el), 'poster'));

    // Inline style="background:url(...)" → theme-assets
    $('[style]').each((_, el) => {
      const $el = $(el);
      const s = $el.attr('style') || '';
      const out = s.replace(/url\((['"]?)(?!https?:|\/\/|\/|data:|#)([^'")]+)\1\)/gi,
        (_m, q, u) => `url(${q}${base}/${u.replace(/^\.?\//, '')}${q})`);
      if (out !== s) $el.attr('style', out);
    });

    return $.html();
  },

  /** Replace WordPress-style tags with live CMS data (Phase 2). */
  async applyTags(html: string, ctx: { pagePath: string; themeName: string }): Promise<string> {
    let out = html;
    const year = String(new Date().getFullYear());

    // Site identity + menu + posts, each guarded so a data hiccup never breaks render.
    let siteTitle = ctx.themeName;
    const siteDescription = '';
    let menuHtml = '';
    let contentHtml = '';
    let pageTitle = ctx.pagePath ? ctx.pagePath.replace(/[-/]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Home';

    try {
      const { getUserDbConnection, getSettingsModel } = await import('@/utils/db');
      await getUserDbConnection();
      const Settings = getSettingsModel();
      const s = (await Settings.findOne({}).lean().exec()) as { siteTitle?: string } | null;
      if (s?.siteTitle) siteTitle = s.siteTitle;
    } catch { /* keep theme name */ }

    try {
      const pageDb = await getPageDbConnection();
      const Page = getPageModel(pageDb);
      const pages = (await Page.find({ pageType: 'page', isPublished: true })
        .select('pageName slug isHome')
        .sort({ isHome: -1, updatedAt: -1 })
        .lean()
        .exec()) as Array<{ pageName?: string; slug?: string; isHome?: boolean }>;
      menuHtml = pages
        .filter((p) => p.slug)
        .slice(0, 8)
        .map((p) => `<li><a href="/${p.isHome ? '' : p.slug}">${escapeHtml(p.pageName || p.slug!)}</a></li>`)
        .join('');

      // {{content}} — the matched CMS page's blocks, lightly serialized.
      const match = (await Page.findOne({ slug: ctx.pagePath || 'home', pageType: 'page' }).lean().exec()) as
        | { pageName?: string; component?: Array<Record<string, unknown>> }
        | null;
      if (match) {
        if (match.pageName) pageTitle = match.pageName;
        contentHtml = serializeBlocks(match.component || []);
      }
    } catch { /* no menu/content */ }

    // posts loop: {{#posts}} … {{/posts}}
    out = await replacePostsLoop(out);

    const map: Record<string, string> = {
      site_title: escapeHtml(siteTitle),
      site_description: escapeHtml(siteDescription),
      site_url: '',
      page_title: escapeHtml(pageTitle),
      menu: menuHtml,
      content: contentHtml,
      year,
    };
    out = out.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, key) =>
      Object.prototype.hasOwnProperty.call(map, key.toLowerCase()) ? map[key.toLowerCase()] : m
    );
    return out;
  },

  /** Full pipeline: resolve → read → rewrite URLs → fill tags → HTML document. */
  async renderSite(slug: string, pagePath: string, active: ActiveTemplateTheme): Promise<RenderResult> {
    const file =
      this.resolveTemplate(pagePath, active.htmlTemplates) ||
      (active.htmlTemplates[0] ?? null);
    if (!file) return { html: notFoundDoc(active.name), status: 404 };

    const raw = await this.readTemplate(slug, file);
    if (raw == null) {
      const f404 = this.resolveTemplate(pagePath, active.htmlTemplates, { is404: true });
      const raw404 = f404 ? await this.readTemplate(slug, f404) : null;
      if (raw404 == null) return { html: notFoundDoc(active.name), status: 404 };
      return { html: await this.process(raw404, slug, pagePath, active.name), status: 404 };
    }

    return { html: await this.process(raw, slug, pagePath, active.name), status: 200 };
  },

  /**
   * Return the theme HTML for serving.
   *
   * IMPORTANT: a self-contained theme (no relative asset paths and no template
   * tags) is served **VERBATIM — byte-for-byte, exactly as uploaded**. No cheerio
   * round-trip, no URL rewriting, no tag substitution. Only themes that actually
   * need it (relative `assets/…` paths, or `{{tags}}`) get the minimal processing
   * required to function.
   */
  async process(raw: string, slug: string, pagePath: string, themeName: string): Promise<string> {
    if (!needsProcessing(raw)) return raw; // ← exact, unchanged upload
    const rewritten = this.rewriteUrls(raw, slug);
    let filled = await this.applyTags(rewritten, { pagePath, themeName });
    if (!/^\s*<!doctype/i.test(filled)) filled = `<!doctype html>\n${filled}`;
    return filled;
  },
};

/**
 * True only when the HTML genuinely requires transformation to work:
 *  - contains `{{ … }}` template tags, OR
 *  - references a RELATIVE asset (href/src/poster or CSS url()) that must be
 *    rewritten to /theme-assets/… to resolve.
 * Absolute (https/// /), anchor (#), and data: URLs need nothing, so a fully
 * self-contained theme returns false → it is served unchanged.
 */
function needsProcessing(html: string): boolean {
  if (/\{\{/.test(html)) return true;
  if (/(?:href|src|poster)\s*=\s*["'](?!https?:|\/\/|\/|#|data:|mailto:|tel:|javascript:)[^"']+["']/i.test(html)) return true;
  if (/url\(\s*['"]?(?!https?:|\/\/|\/|data:|#)[^'")]+/i.test(html)) return true;
  return false;
}

// ---------- helpers ----------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/** Minimal block → HTML serializer for the {{content}} tag. */
function serializeBlocks(blocks: Array<Record<string, unknown>>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    let c: Record<string, unknown> = {};
    try {
      c = typeof b.content === 'string' && (b.content as string).startsWith('{') ? JSON.parse(b.content as string) : {};
    } catch { c = {}; }
    const title = (c.title || c.mainTitle || c.heading) as string | undefined;
    const desc = (c.description || c.subtitle || c.subheading) as string | undefined;
    if (title) parts.push(`<h2>${escapeHtml(String(title))}</h2>`);
    if (desc) parts.push(`<p>${escapeHtml(String(desc))}</p>`);
  }
  return parts.join('\n');
}

/** Expand a {{#posts}}…{{/posts}} block with the latest published blog posts. */
async function replacePostsLoop(html: string): Promise<string> {
  const re = /\{\{\s*#posts\s*\}\}([\s\S]*?)\{\{\s*\/posts\s*\}\}/gi;
  if (!re.test(html)) return html;
  let posts: Array<{ title: string; excerpt: string; url: string; date: string }> = [];
  try {
    const pageDb = await getPageDbConnection();
    const { getBlogPostModel } = await import('@/utils/db');
    const Blog = getBlogPostModel(pageDb);
    const docs = (await Blog.find({ status: 'published' })
      .select('pageName slug seo publishedAt')
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean()
      .exec()) as Array<{ pageName?: string; slug?: string; seo?: { description?: string }; publishedAt?: Date }>;
    posts = docs.map((d) => ({
      title: d.pageName || d.slug || 'Untitled',
      excerpt: d.seo?.description || '',
      url: `/blog/${d.slug || ''}`,
      date: d.publishedAt ? new Date(d.publishedAt).toLocaleDateString() : '',
    }));
  } catch { posts = []; }

  return html.replace(re, (_m, tpl: string) =>
    posts
      .map((p) =>
        tpl
          .replace(/\{\{\s*title\s*\}\}/gi, escapeHtml(p.title))
          .replace(/\{\{\s*excerpt\s*\}\}/gi, escapeHtml(p.excerpt))
          .replace(/\{\{\s*url\s*\}\}/gi, p.url)
          .replace(/\{\{\s*date\s*\}\}/gi, escapeHtml(p.date))
      )
      .join('')
  );
}

function notFoundDoc(themeName: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Not found</title></head><body style="font-family:system-ui;padding:40px"><h1>404</h1><p>The theme "${escapeHtml(themeName)}" has no template for this page.</p></body></html>`;
}
