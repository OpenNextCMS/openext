'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
 */
export default function ActiveThemeScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
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

  const vars = useMemo(() => (config ? themeConfigToCssVars(config) : undefined), [config]);

  return (
    <div className={`site-theme-scope${className ? ` ${className}` : ''}`} style={vars}>
      {children}
    </div>
  );
}
