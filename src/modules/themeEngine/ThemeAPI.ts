import React from 'react';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import type { BlockData } from '@/types';
import { assetManager, type AssetManager } from './AssetManager';
import { resolveImageUrl } from './bridges/imageBridge';
import { parseThemeSectionContent } from './sectionSchema';
import type { CmsBlock, CmsMenuItem, CmsPage, CmsUserSummary, LoadedTheme, RenderInput, ThemeAPI as ThemeAPIInterface } from './types';

/**
 * §4.11 ThemeAPI — the ONLY surface theme components may call. No Prisma, no
 * Mongoose, no raw DB access from inside `/themes/**` — every method here is
 * a SYNCHRONOUS accessor over data that was already fetched by the CMS and
 * handed to `ThemeRenderer.render()` (via `RenderInput`) or already resolved
 * by `ThemeLoader` (via `LoadedTheme`). Nothing in this class ever queries
 * Mongo — that is what module 9's own verification asserts directly (a spy
 * on the Mongoose query layer that must stay at zero calls).
 *
 * Constructed FRESH per request by `ThemeRenderer` (never a singleton), so
 * one request's page/user context can never leak into another's render.
 */
export interface ThemeAPIContext {
  input: RenderInput;
  loadedTheme: LoadedTheme;
  /** Already-resolved `theme_settings.perThemeSettings[slug]` (spec §1.2) — resolving it IS a Mongo read, so it happens before this class exists, not inside it. */
  themeSettingValues?: Record<string, unknown>;
  assets?: AssetManager;
}

export class ThemeApiImpl implements ThemeAPIInterface {
  private readonly assets: AssetManager;

  constructor(private readonly ctx: ThemeAPIContext) {
    this.assets = ctx.assets ?? assetManager;
  }

  site(): { name: string; url: string; description: string } {
    const s = this.ctx.input.settings;
    return { name: s.name, url: s.url, description: s.description };
  }

  page(): CmsPage {
    return this.ctx.input.page;
  }

  menu(key: string): CmsMenuItem[] {
    // v1 limitation (documented in bridges/menuBridge.ts): every declared key
    // resolves to the same single menu — the CMS has no per-key storage yet.
    const found = this.ctx.input.menus.find((m) => m.key === key);
    return (found ?? this.ctx.input.menus[0])?.items ?? [];
  }

  navigation(key: string): CmsMenuItem[] {
    return this.menu(key);
  }

  asset(relativePath: string): string {
    return this.assets.getPublicAssetUrl(this.ctx.loadedTheme.manifest.slug, relativePath);
  }

  image(cmsImageRef: string, opts?: { width?: number; height?: number }): string {
    return resolveImageUrl(cmsImageRef, opts);
  }

  /** This theme's OWN settings values: manifest-declared defaults, overridden by admin-saved values. Site-level info lives on `site()`, not here. */
  settings(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const s of this.ctx.loadedTheme.manifest.themeSettings) defaults[s.key] = s.default;
    return { ...defaults, ...(this.ctx.themeSettingValues ?? {}) };
  }

  blocks(): React.ReactElement[] {
    const source = this.ctx.input.draftBlocks ?? this.ctx.input.blocks;
    return source
      .filter((block) => {
        const parsed = parseThemeSectionContent(
          (block.data as { content?: unknown })?.content ?? block.data
        );
        return !parsed?.hidden;
      })
      .map((block) => this.renderBlock(block));
  }

  currentUser(): CmsUserSummary | null {
    return this.ctx.input.currentUser ?? null;
  }

  logo(): string | null {
    return this.ctx.input.settings.logo ?? null;
  }

  /** The theme's Footer partial, or a minimal built-in default (spec §4.10: "render Footer (or default)") — never empty, never throws. */
  footer(): React.ReactElement {
    const Footer = this.ctx.loadedTheme.partials.Footer;
    // Same calling convention as the Template component (ThemeRenderer passes
    // {theme: api}) — a theme's Header/Footer partials expect `theme` as a prop too.
    if (Footer) return React.createElement(Footer, { theme: this });
    const { name } = this.site();
    return React.createElement('footer', { 'data-theme-engine-default': 'footer' }, `© ${new Date().getFullYear()} ${name}`);
  }

  /** The theme's Header partial, or a minimal built-in default (spec §4.10: "render Header (or default)") — never empty, never throws. */
  header(): React.ReactElement {
    const Header = this.ctx.loadedTheme.partials.Header;
    if (Header) return React.createElement(Header, { theme: this });
    const { name } = this.site();
    return React.createElement('header', { 'data-theme-engine-default': 'header' }, React.createElement('a', { href: '/' }, name));
  }

  /**
   * A block whose type the active theme declares a renderer for uses it;
   * otherwise this falls back to the CMS's own existing block renderer
   * (`RenderFromJson`/`RenderBlock`, covering the ~65 pre-existing block
   * types) so real, already-published pages keep rendering correctly even
   * before a theme declares coverage for every type — a theme can still
   * override any specific type by declaring its own renderer for it. This is
   * a deliberate extension beyond the spec's literal "placeholder, never
   * throw" wording, confirmed during the public-site wiring step; the
   * placeholder is now the LAST resort, only when the CMS fallback itself
   * throws (never propagated — blocks() must never throw, spec §4.10).
   */
  private renderBlock(block: CmsBlock): React.ReactElement {
    const parsed = parseThemeSectionContent(
      (block.data as { content?: unknown })?.content ?? block.data
    );
    const sectionId = parsed?.sectionId || block.id;
    const blockPayload = parsed
      ? {
          ...block,
          data: {
            ...parsed.data,
            id: block.id,
            type: block.type,
            sectionId: parsed.sectionId,
          },
        }
      : block;

    let inner: React.ReactElement;
    const registered = this.ctx.loadedTheme.blocks[block.type];
    if (registered) {
      inner = React.createElement(registered.Renderer, {
        key: block.id,
        block: blockPayload,
        schema: registered.schema,
        data: parsed?.data || block.data,
      });
    } else {
      try {
        inner = renderFromJson(block.data as unknown as BlockData);
      } catch {
        inner = React.createElement(
          'div',
          { key: block.id, 'data-theme-engine-missing-block': block.type },
          `Block type "${block.type}" is not supported by this theme.`
        );
      }
    }

    if (!this.ctx.input.editMode) return inner;

    // Non-layout-changing markers for the exact editor iframe bridge.
    return React.createElement(
      'div',
      {
        key: block.id,
        'data-theme-section-id': sectionId,
        'data-theme-section-type': block.type,
        style: { display: 'contents' },
      },
      inner
    );
  }
}
