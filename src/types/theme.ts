import type { Document } from 'mongoose';
import type { ComponentVariants } from './component-variants';

/**
 * Site-wide Theme token system.
 *
 * This is the configuration-driven, site-wide theme (distinct from the
 * blog-only `IBlogThemeSettings` in ./index, which stays independent).
 * All public UI reads these tokens via CSS variables — see
 * `src/lib/theme/cssVars.site.ts` for the variable mapping.
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeTypography {
  /** Large display/hero face (e.g. Space Grotesk). Falls back to heading font. */
  displayFont: string;
  headingFont: string;
  bodyFont: string;
  baseFontSize: string; // e.g. "16px"
  lineHeight: string; // e.g. "1.6"
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeLayout {
  containerWidth: string; // e.g. "1200px" or "100%"
  sectionSpacing: string; // e.g. "80px"
}

export interface ThemeConfig {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  layout: ThemeLayout;
}

/** A partial config used when merging user input onto the defaults. */
export type PartialThemeConfig = {
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  spacing?: Partial<ThemeSpacing>;
  radius?: Partial<ThemeRadius>;
  shadows?: Partial<ThemeShadows>;
  layout?: Partial<ThemeLayout>;
};

/** Slugs of the in-code system (default) themes. */
export type SystemThemeId =
  | 'startup'
  | 'agency'
  | 'corporate'
  | 'ecommerce'
  | 'portfolio'
  | 'neoflow';

/**
 * The persisted theme shape (lean object form). The Mongoose document type
 * extends this. `meta` is a reserved, forward-compat bag so future features
 * (export/import, versioning, AI generation, marketplace) can attach data
 * without a schema migration.
 */
export interface ITheme {
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  isSystemTheme: boolean;
  isActive: boolean;
  version: string;
  previewImage?: string;
  createdBy?: string;
  /** Page-DB name for traceability only — real isolation is the DB. */
  tenantId?: string;
  theme: ThemeConfig;
  componentVariants: ComponentVariants;
  meta?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IThemeDocument extends Omit<ITheme, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

/** A theme as returned over the API (id stringified, dates ISO). */
export interface ThemeDTO extends ITheme {
  _id: string;
}
