import type { ObjectId } from 'mongodb';
import type React from 'react';

/**
 * Theme Engine — core domain types (spec §1, §2, §4).
 *
 * This file is the single contract every other module compiles against. It is
 * PURE TYPES: no runtime imports of Mongoose, no filesystem, no React runtime.
 *
 * Boundary rule (spec §0): the Theme Engine's only contract with the rest of the
 * CMS is `{ page, blocks, menus, settings }` in → rendered HTML/JSX out. The CMS
 * entities below are intentionally OPAQUE to the engine — it never inspects or
 * queries them, it only passes them through to theme components via ThemeAPI.
 */

/* ------------------------------------------------------------------ *
 * Opaque CMS entities (owned by the existing CMS, not by this engine)
 * ------------------------------------------------------------------ */

/** A page document from the existing CMS. Opaque to the Theme Engine. */
export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  type: 'home' | 'page' | 'post' | 'archive' | 'custom';
  /** Optional theme-defined template key (drives TemplateHierarchy §4.7). */
  templateKey?: string;
  [key: string]: unknown;
}

/** A block stored on a CMS page. `type` is matched to a theme block renderer. */
export interface CmsBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CmsMenuItem {
  id: string;
  label: string;
  url: string;
  children?: CmsMenuItem[];
  [key: string]: unknown;
}

export interface CmsMenu {
  key: string;
  items: CmsMenuItem[];
}

export interface CmsSiteSettings {
  name: string;
  url: string;
  description: string;
  logo?: string | null;
  [key: string]: unknown;
}

export interface CmsUserSummary {
  id: string;
  name: string;
  role: string;
}

/* ------------------------------------------------------------------ *
 * §2 Manifest
 * ------------------------------------------------------------------ */

export type ThemeSettingType = 'text' | 'color' | 'select' | 'boolean' | 'image' | 'number';

export type ThemeSupportedFeature =
  | 'dark-mode'
  | 'rtl'
  | 'custom-logo'
  | 'post-thumbnails'
  | 'widgets'
  | 'menus'
  | 'block-editor';

export interface ThemeManifestTemplates {
  home?: string;
  page?: string;
  post?: string;
  archive?: string;
  /** REQUIRED — the ultimate fallback; guaranteed to exist by ThemeValidator. */
  index: string;
  /** Theme-defined named templates. */
  [customTemplateKey: string]: string | undefined;
}

export interface ThemeManifestPartials {
  header?: string;
  footer?: string;
  sidebar?: string;
}

export interface ThemeManifestMenu {
  key: string;
  label: string;
  maxDepth?: number;
}

export interface ThemeManifestWidgetArea {
  key: string;
  label: string;
  /** If omitted, all registered block types are allowed. */
  allowedBlockTypes?: string[];
}

export interface ThemeManifestSetting {
  key: string;
  label: string;
  type: ThemeSettingType;
  default: unknown;
  /** Required (non-empty) when `type === 'select'`. */
  options?: string[];
}

export interface ThemeManifestBlock {
  /** Matches `CmsBlock.type` stored in CMS pages. */
  type: string;
  /** Relative to the theme root, e.g. `blocks/Hero/Renderer.tsx`. */
  rendererPath: string;
  /** Relative to the theme root, e.g. `blocks/Hero/schema.ts`. */
  schemaPath?: string;
}

export interface ThemeManifest {
  name: string;
  /** Derived from `name` when absent (kebab-case). */
  slug: string;
  author: string;
  version: string;
  description?: string;
  compatibleCmsVersion: string;
  templates: ThemeManifestTemplates;
  partials: ThemeManifestPartials;
  menus: ThemeManifestMenu[];
  widgetAreas: ThemeManifestWidgetArea[];
  themeSettings: ThemeManifestSetting[];
  supportedFeatures: ThemeSupportedFeature[];
  blocks?: ThemeManifestBlock[];
}

/* ------------------------------------------------------------------ *
 * §1 MongoDB documents
 * ------------------------------------------------------------------ */

export type ThemeStatus = 'installed' | 'installing' | 'failed' | 'disabled';

export interface ThemeInstallLogEntry {
  step: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  at: Date;
}

/** §1.1 `themes` collection. */
export interface ThemeDocument {
  _id: ObjectId;
  slug: string;
  name: string;
  author: string;
  version: string;
  description?: string;
  compatibleCmsVersion: string;
  status: ThemeStatus;
  manifest: ThemeManifest;
  installPath: string;
  checksum: string;
  installedAt: Date;
  updatedAt: Date;
  installedBy: ObjectId;
  installLog: ThemeInstallLogEntry[];
  /** Content hashes computed once at install (spec §4.9 — never per-request). */
  assetHashes?: { stylesheet?: string; script?: string };
}

/** §1.2 `theme_settings` — exactly one document, `_id: "singleton"`. */
export interface ThemeSettingsDocument {
  _id: 'singleton';
  activeThemeSlug: string | null;
  /** Rollback target for a failed activation. */
  previousThemeSlug: string | null;
  activatedAt: Date | null;
  activatedBy: ObjectId | null;
  /** slug -> theme-defined settings values. */
  perThemeSettings: Record<string, Record<string, unknown>>;
}

/** §1.3 `theme_preview_sessions` — TTL-expired by Mongo on `expiresAt`. */
export interface ThemePreviewSessionDocument {
  _id: ObjectId;
  token: string;
  themeSlug: string;
  createdBy: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

/* ------------------------------------------------------------------ *
 * §4 Module contracts
 * ------------------------------------------------------------------ */

/** §4.1 — one failing field. Every failure is reported, not just the first. */
export interface ManifestIssue {
  path: string;
  message: string;
}

export interface ManifestParseResult {
  manifest: ThemeManifest;
  warnings: string[];
}

/** §4.2 */
export interface ThemeValidationIssue {
  code: string;
  message: string;
  file?: string;
}

export interface ThemeValidationResult {
  valid: boolean;
  manifest?: ThemeManifest;
  errors: ThemeValidationIssue[];
  warnings: ThemeValidationIssue[];
}

/** §4.6 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThemeComponent = React.ComponentType<any>;

export interface LoadedThemeBlock {
  Renderer: ThemeComponent;
  schema?: unknown;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  templates: Record<string, ThemeComponent>;
  partials: {
    Header?: ThemeComponent;
    Footer?: ThemeComponent;
    Sidebar?: ThemeComponent;
  };
  blocks: Record<string, LoadedThemeBlock>;
}

/** §4.7 */
export interface PageRenderContext {
  pageType: 'home' | 'page' | 'post' | 'archive' | 'custom';
  customTemplateKey?: string;
}

/** §4.10 */
export interface RenderInput {
  page: CmsPage;
  blocks: CmsBlock[];
  menus: CmsMenu[];
  settings: CmsSiteSettings;
  /** When set, bypasses the active theme (preview, §4.12). */
  previewThemeSlug?: string;
  /** Read-only current user, if any (surfaced via ThemeAPI.currentUser()). */
  currentUser?: CmsUserSummary | null;
}

export interface RenderResult {
  element: React.ReactElement;
  stylesheetUrl: string;
  scriptUrl: string;
  /** True when the default theme or default header/footer was substituted. */
  usedFallback: boolean;
}

/** §4.11 — the ONLY surface theme components may call. No DB access. */
export interface ThemeAPI {
  site(): { name: string; url: string; description: string };
  page(): CmsPage;
  menu(key: string): CmsMenuItem[];
  asset(relativePath: string): string;
  image(cmsImageRef: string, opts?: { width?: number; height?: number }): string;
  settings(): Record<string, unknown>;
  navigation(key: string): CmsMenuItem[];
  blocks(): React.ReactElement[];
  currentUser(): CmsUserSummary | null;
  logo(): string | null;
  footer(): React.ReactElement;
  header(): React.ReactElement;
}

/** §4.12 */
export interface ThemePreviewTicket {
  token: string;
  expiresAt: Date;
}
