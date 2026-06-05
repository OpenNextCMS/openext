import type { CSSProperties } from 'react';
import type {
  ThemeConfig,
  PartialThemeConfig,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadows,
  ThemeLayout,
} from '@/types/theme';

/**
 * Site-wide theme token engine.
 *
 * Generalises the blog-only `cssVars.ts` to the full ThemeConfig. Emits CSS
 * custom properties applied on a wrapper element so they cascade to the public
 * page subtree. Blocks consume them via `var(--token, <fallback>)`.
 *
 * The blog `cssVars.ts` is intentionally left untouched.
 */

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#111827',
    muted: '#6b7280',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  typography: {
    headingFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    baseFontSize: '16px',
    lineHeight: '1.6',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  },
  layout: {
    containerWidth: '1200px',
    sectionSpacing: '80px',
  },
};

/** Deep-merge a partial config onto the defaults. Always returns a complete config. */
export function mergeThemeConfig(partial?: PartialThemeConfig | null): ThemeConfig {
  const d = DEFAULT_THEME_CONFIG;
  const p = partial || {};
  return {
    colors: { ...d.colors, ...(p.colors || {}) } as ThemeColors,
    typography: { ...d.typography, ...(p.typography || {}) } as ThemeTypography,
    spacing: { ...d.spacing, ...(p.spacing || {}) } as ThemeSpacing,
    radius: { ...d.radius, ...(p.radius || {}) } as ThemeRadius,
    shadows: { ...d.shadows, ...(p.shadows || {}) } as ThemeShadows,
    layout: { ...d.layout, ...(p.layout || {}) } as ThemeLayout,
  };
}

/**
 * Build the CSS custom properties for a theme config. Applied as inline style
 * on a wrapper element so the whole subtree inherits the tokens. The wrapper
 * also sets base background/color/font so unstyled blocks pick up the theme.
 */
export function themeConfigToCssVars(config: ThemeConfig): CSSProperties {
  const { colors, typography, spacing, radius, shadows, layout } = config;
  return {
    // Colors
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-bg': colors.background,
    '--color-surface': colors.surface,
    '--color-text': colors.text,
    '--color-muted': colors.muted,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-danger': colors.danger,
    // Typography
    '--font-heading': typography.headingFont,
    '--font-body': typography.bodyFont,
    '--font-size-base': typography.baseFontSize,
    '--line-height-base': typography.lineHeight,
    // Spacing
    '--space-xs': spacing.xs,
    '--space-sm': spacing.sm,
    '--space-md': spacing.md,
    '--space-lg': spacing.lg,
    '--space-xl': spacing.xl,
    '--section-spacing': layout.sectionSpacing,
    // Radius (--radius is a back-compat alias of md)
    '--radius': radius.md,
    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-xl': radius.xl,
    // Shadows
    '--shadow-sm': shadows.sm,
    '--shadow-md': shadows.md,
    '--shadow-lg': shadows.lg,
    // Layout
    '--layout-width': layout.containerWidth,
    '--container-padding': spacing.lg,
    // Base cascade so unstyled blocks inherit the theme
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--font-size-base)',
    lineHeight: 'var(--line-height-base)',
  } as CSSProperties;
}
