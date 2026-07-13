'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { themeConfigToCssVars, mergeThemeConfig } from '@/lib/theme/cssVars.site';
import { themeApi } from '@/components/theme-builder/api';
import type { ThemeConfig } from '@/types/theme';

/**
 * Client-side counterpart to the server `SiteThemeProvider` used on public pages.
 *
 * The builder canvas and `/preview` render blocks with `RenderBlock` but are NOT
 * wrapped in the public `.site-theme-scope`, so without this the blocks fall back
 * to their default colors and never reflect the uploaded/activated theme. This
 * loads the tenant's ACTIVE theme once and applies its tokens as CSS variables,
 * so blocks preview with the real theme in the editor exactly as they do live.
 *
 * Until the active theme loads (or if none is active) it renders children with no
 * overrides, so the canvas still shows sensible defaults.
 *
 * `variablesOnly` applies just the theme's CSS custom properties (`--color-*`,
 * `--font-*`, …) and omits the base background/color/font cascade. Use it on the
 * live EDIT canvas so blocks still read theme tokens, but the theme's (usually
 * light) page background does NOT paint over the editor's own dark-mode surface.
 * Leave it off for preview surfaces that should mirror the live themed site.
 */
export default function ActiveThemeScope({
  children,
  className,
  variablesOnly = false,
}: {
  children: ReactNode;
  className?: string;
  variablesOnly?: boolean;
}) {
  const [config, setConfig] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    let alive = true;
    themeApi
      .list()
      .then((themes) => {
        if (!alive) return;
        const active = themes.find((t) => t.isActive);
        if (active?.theme) setConfig(mergeThemeConfig(active.theme));
      })
      .catch(() => {
        // Non-critical — fall back to unthemed defaults so the canvas still renders.
      });
    return () => {
      alive = false;
    };
  }, []);

  const vars = useMemo(() => {
    if (!config) return undefined;
    const all = themeConfigToCssVars(config);
    if (!variablesOnly) return all;
    // Keep only the CSS custom properties; drop backgroundColor/color/fontFamily/…
    // so the editor canvas keeps its dark-mode-aware surface.
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => key.startsWith('--'))
    ) as CSSProperties;
  }, [config, variablesOnly]);

  return (
    <div className={`site-theme-scope${className ? ` ${className}` : ''}`} style={vars}>
      {children}
    </div>
  );
}
