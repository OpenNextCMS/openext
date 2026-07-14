import type { ComponentVariants } from '@/types/component-variants';
import type { ThemeConfig, PartialThemeConfig } from '@/types/theme';

/** Metadata from a package's root theme.json (package format v2). */
export interface ThemePackageMeta {
  name: string;
  slug: string;
  version: string;
  author?: string;
  description?: string;
  preview?: string;
  thumbnail?: string;
  compatibleCms?: string;
  supports?: string[];
  /** When true, activation also applies layouts/default to the homepage. */
  applyPageLayout?: boolean;
  /** Informational package format tag */
  format?: string;
}

/** Structured contents parsed from a theme ZIP (before persistence). */
export interface ParsedThemePackage {
  meta: ThemePackageMeta;
  /** Merged Theme Builder config (from tokens/ or inline theme). */
  theme: ThemeConfig;
  componentVariants: ComponentVariants;
  /** Raw token JSON objects keyed by group (colors, spacing, …). */
  tokens: Record<string, unknown>;
  templates: {
    header?: unknown;
    footer?: unknown;
  };
  layouts: Record<string, unknown>;
  /** Block presets (hero, pricing, …) + style presets (buttons, cards). */
  presets: {
    blocks: Record<string, unknown>;
    styles: Record<string, unknown>;
  };
  supports: string[];
  /** Relative paths inside the package that should be extracted to disk. */
  assetEntries: ThemeZipEntry[];
  previewBuffer?: Buffer;
  previewExt?: string;
  thumbnailBuffer?: Buffer;
  thumbnailExt?: string;
}

export interface ThemeZipEntry {
  /** Path relative to package root (posix). */
  relativePath: string;
  size: number;
  getBuffer: () => Promise<Buffer>;
}

/** Result after upload + persistence. */
export interface InstalledThemePackage {
  themeId: string;
  slug: string;
  name: string;
  version: string;
  assetsPath: string;
  installed: boolean;
  active: boolean;
}

export interface ThemePackageUpdateInput {
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  theme?: PartialThemeConfig;
  componentVariants?: ComponentVariants;
  tokens?: Record<string, unknown>;
  templates?: {
    header?: unknown;
    footer?: unknown;
  };
  layouts?: Record<string, unknown>;
  presets?: {
    blocks?: Record<string, unknown>;
    styles?: Record<string, unknown>;
  };
  supports?: string[];
  previewImage?: string;
  thumbnail?: string;
}

export interface ThemeAssetServeResult {
  buffer: Buffer;
  contentType: string;
  cacheControl: string;
}
