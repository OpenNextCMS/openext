import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { THEMES_DIR } from '../config';
import { ThemeRepository, type InstalledThemeRecord } from '../repositories/ThemeRepository';
import { themeCache, CacheKeys, CacheTags } from './CacheManager';
import { ThemeEngineError, ThemeNotFoundError } from '../errors';

/**
 * ThemeEngine — the dynamic theme loader / rendering resolver (spec §7).
 *
 * The CMS NEVER hard-codes a layout. Everything resolves against the ACTIVE
 * theme's folder (`/themes/<slug>`), in the order:
 *   Current Theme → Layout → Components → Header → Footer → Pages.
 *
 * A theme file is "renderable" in one of two ways:
 *   • a JS/MJS module (component theme) → dynamically imported;
 *   • an .html file (template theme)    → returned as markup.
 * (.tsx/.ts source must ship precompiled to be importable at runtime — enforced
 * here with a clear error rather than a silent failure.)
 *
 * Every resolution is cached and tagged by theme slug so activation/delete/update
 * invalidate cleanly (§12, §17: no duplicate bundles, no re-render churn).
 */

export type RenderableKind = 'module' | 'html';

export interface Renderable {
  kind: RenderableKind;
  slug: string;
  relativePath: string;
  absolutePath: string;
  /** Present when kind === 'module'. The imported module namespace. */
  module?: Record<string, unknown>;
  /** Present when kind === 'html'. Raw markup. */
  html?: string;
}

export interface LoadedAsset {
  absolutePath: string;
  /** Public URL the asset route serves (§9 asset serving). */
  url: string;
  buffer: Buffer;
  contentType: string;
}

/** Candidate extensions tried, in resolution preference order. */
const MODULE_EXTS = ['.mjs', '.cjs', '.js'];
const HTML_EXTS = ['.html', '.htm'];
const SOURCE_ONLY_EXTS = ['.tsx', '.ts', '.jsx'];

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.html': 'text/html; charset=utf-8',
};

export const ThemeEngine = {
  themeDir(slug: string): string {
    return path.join(THEMES_DIR, slug);
  },

  /** Join safely inside the theme folder (defends against traversal). */
  resolvePath(slug: string, relativePath: string): string {
    const root = this.themeDir(slug);
    const clean = relativePath.replace(/^\.?[\\/]+/, '');
    const abs = path.resolve(root, clean);
    const rel = path.relative(path.resolve(root), abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new ThemeEngineError(`Asset path escapes the theme directory: "${relativePath}".`, { slug, relativePath });
    }
    return abs;
  },

  /** The active theme record, cached (§7 getActiveTheme). */
  async getActiveTheme(): Promise<InstalledThemeRecord | null> {
    const cached = themeCache.get<InstalledThemeRecord>(CacheKeys.active());
    if (cached) return cached;
    const record = await ThemeRepository.findActive();
    if (record) themeCache.set(CacheKeys.active(), record, { tags: [CacheTags.activeTheme(), CacheTags.theme(record.slug)] });
    return record;
  },

  /** Load a theme record + verify its folder exists on disk (§7 loadTheme). */
  async loadTheme(slug?: string): Promise<InstalledThemeRecord> {
    const record = slug ? await ThemeRepository.findBySlug(slug) : await this.getActiveTheme();
    if (!record) throw new ThemeNotFoundError(slug ?? '(active)');
    const dir = this.themeDir(record.slug);
    try {
      await fs.access(dir);
    } catch {
      throw new ThemeEngineError(`Theme "${record.slug}" is registered but its files are missing.`, { dir });
    }
    return record;
  },

  /** Resolve a base name (no ext) to the first existing renderable file. */
  async resolve(slug: string, baseNoExt: string): Promise<Renderable | null> {
    const candidates: string[] = [];
    for (const ext of [...MODULE_EXTS, ...HTML_EXTS, ...SOURCE_ONLY_EXTS]) candidates.push(`${baseNoExt}${ext}`);
    for (const ext of [...MODULE_EXTS, ...HTML_EXTS]) candidates.push(`${baseNoExt}/index${ext}`);

    for (const rel of candidates) {
      const abs = this.resolvePath(slug, rel);
      if (!(await fileExists(abs))) continue;
      const ext = path.extname(abs).toLowerCase();

      if (SOURCE_ONLY_EXTS.includes(ext)) {
        throw new ThemeEngineError(
          `"${rel}" is TypeScript/JSX source and cannot be imported at runtime. Ship a compiled .js/.mjs, or use an .html template.`,
          { slug, rel }
        );
      }
      if (HTML_EXTS.includes(ext)) {
        return { kind: 'html', slug, relativePath: rel, absolutePath: abs, html: await fs.readFile(abs, 'utf8') };
      }
      const mod = (await import(/* webpackIgnore: true */ pathToFileURL(abs).href)) as Record<string, unknown>;
      return { kind: 'module', slug, relativePath: rel, absolutePath: abs, module: mod };
    }
    return null;
  },

  /** Cached variant of resolve(). */
  async loadRenderable(slug: string, baseNoExt: string, cacheKey: string): Promise<Renderable | null> {
    const hit = themeCache.get<Renderable>(cacheKey);
    if (hit) return hit;
    const resolved = await this.resolve(slug, baseNoExt);
    if (resolved) themeCache.set(cacheKey, resolved, { tags: [CacheTags.theme(slug)] });
    return resolved;
  },

  /** §7 loadLayout */
  async loadLayout(slug?: string): Promise<Renderable | null> {
    const theme = await this.loadTheme(slug);
    return this.loadRenderable(theme.slug, 'layout', CacheKeys.layout(theme.slug))
      .then((r) => r ?? this.loadRenderable(theme.slug, 'layouts/default', CacheKeys.layout(theme.slug)));
  },

  async loadHeader(slug?: string): Promise<Renderable | null> {
    const theme = await this.loadTheme(slug);
    return this.loadRenderable(theme.slug, 'header', CacheKeys.component(theme.slug, 'header'));
  },

  async loadFooter(slug?: string): Promise<Renderable | null> {
    const theme = await this.loadTheme(slug);
    return this.loadRenderable(theme.slug, 'footer', CacheKeys.component(theme.slug, 'footer'));
  },

  /** §7 loadComponent — looks under components/, then theme root. */
  async loadComponent(name: string, slug?: string): Promise<Renderable | null> {
    const theme = await this.loadTheme(slug);
    const safe = name.replace(/[^a-zA-Z0-9/_-]/g, '');
    return (
      (await this.loadRenderable(theme.slug, `components/${safe}`, CacheKeys.component(theme.slug, `components/${safe}`))) ||
      (await this.loadRenderable(theme.slug, safe, CacheKeys.component(theme.slug, safe)))
    );
  },

  /** §7 loadPage — pages/<slug>, then <slug> at root, then pages/index. */
  async loadPage(pageSlug: string, slug?: string): Promise<Renderable | null> {
    const theme = await this.loadTheme(slug);
    const safe = (pageSlug || 'index').replace(/[^a-zA-Z0-9/_-]/g, '') || 'index';
    return (
      (await this.loadRenderable(theme.slug, `pages/${safe}`, CacheKeys.page(theme.slug, safe))) ||
      (await this.loadRenderable(theme.slug, safe, CacheKeys.page(theme.slug, `root:${safe}`))) ||
      (await this.loadRenderable(theme.slug, 'pages/index', CacheKeys.page(theme.slug, 'index')))
    );
  },

  /** §7 loadAsset — read + serve a static asset from the active/named theme. */
  async loadAsset(relativePath: string, slug?: string): Promise<LoadedAsset> {
    const theme = await this.loadTheme(slug);
    const key = CacheKeys.asset(theme.slug, relativePath);
    const cached = themeCache.get<LoadedAsset>(key);
    if (cached) return cached;

    const abs = this.resolvePath(theme.slug, relativePath);
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(abs);
    } catch {
      throw new ThemeEngineError(`Asset "${relativePath}" not found in theme "${theme.slug}".`, { relativePath });
    }
    const ext = path.extname(abs).toLowerCase();
    const asset: LoadedAsset = {
      absolutePath: abs,
      url: `/api/themes/asset/${theme.slug}/${relativePath.replace(/^\.?[\\/]+/, '')}`,
      buffer,
      contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
    };
    themeCache.set(key, asset, { tags: [CacheTags.theme(theme.slug)] });
    return asset;
  },
};

async function fileExists(abs: string): Promise<boolean> {
  try {
    return (await fs.stat(abs)).isFile();
  } catch {
    return false;
  }
}
