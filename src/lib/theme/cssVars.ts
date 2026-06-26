import type { CSSProperties } from 'react';
import type { IBlogThemeSettings } from '@/types/index';

export const DEFAULT_BLOG_THEME: IBlogThemeSettings = {
  typography: {
    headingFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    baseSize: 16,
    lineHeight: 1.6,
  },
  colors: { primary: '#2563eb', background: '#ffffff', text: '#111827', accent: '#f59e0b' },
  layout: { width: 'boxed', maxWidth: 1200 },
  radius: 12,
  cardStyle: 'shadow',
  sidebarPosition: 'right',
  darkMode: 'light',
};

/** Deep-merge a partial theme onto the defaults. */
export function mergeTheme(partial?: Partial<IBlogThemeSettings> | null): IBlogThemeSettings {
  const d = DEFAULT_BLOG_THEME;
  const p = partial || {};
  return {
    typography: { ...d.typography, ...(p.typography || {}) },
    colors: { ...d.colors, ...(p.colors || {}) },
    layout: { ...d.layout, ...(p.layout || {}) },
    radius: p.radius ?? d.radius,
    cardStyle: p.cardStyle ?? d.cardStyle,
    sidebarPosition: p.sidebarPosition ?? d.sidebarPosition,
    darkMode: p.darkMode ?? d.darkMode,
  };
}

/**
 * Build the CSS custom properties (from Phase 0's variable set) for a theme.
 * Applied as inline style on a wrapper element so they cascade to the subtree.
 */
export function themeToCssVars(theme: IBlogThemeSettings): CSSProperties {
  return {
    '--color-primary': theme.colors.primary,
    '--color-bg': theme.colors.background,
    '--color-text': theme.colors.text,
    '--color-accent': theme.colors.accent,
    '--radius': `${theme.radius}px`,
    '--font-body': theme.typography.bodyFont,
    '--font-heading': theme.typography.headingFont,
    '--font-size-base': `${theme.typography.baseSize}px`,
    '--line-height-base': String(theme.typography.lineHeight),
    '--layout-width': theme.layout.width === 'boxed' ? `${theme.layout.maxWidth}px` : '100%',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--font-size-base)',
    lineHeight: 'var(--line-height-base)',
  } as CSSProperties;
}

// ---- Contrast helpers (for the design panel's warnings) ----
function toRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = hex.trim().replace('#', '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(n)) return null;
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function luminance(hex: string): number | null {
  const rgb = toRgb(hex);
  if (!rgb) return null;
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** WCAG contrast ratio between two hex colors (1–21), or null if unparseable. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
