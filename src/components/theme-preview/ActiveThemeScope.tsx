'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { themeConfigToCssVars, mergeThemeConfig } from '@/lib/theme/cssVars.site';
import { themeApi } from '@/components/theme-builder/api';
import { ActiveThemeVariantsProvider } from '@/providers/ActiveThemeVariantsProvider';
import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Client-side counterpart to the server `SiteThemeProvider` used on public pages.
 * Loads the active theme (including package presets/layouts) for the editor canvas.
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
  const [componentVariants, setComponentVariants] = useState<ComponentVariants>({});
  const [blockPresets, setBlockPresets] = useState<Record<string, unknown>>({});
  const [stylePresets, setStylePresets] = useState<Record<string, unknown>>({});
  const [layouts, setLayouts] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let alive = true;
    themeApi
      .list()
      .then((themes) => {
        if (!alive) return;
        const active = themes.find((t) => t.isActive);
        if (active?.theme) setConfig(mergeThemeConfig(active.theme));
        setComponentVariants(active?.componentVariants || {});
        setBlockPresets(active?.presets?.blocks || {});
        setStylePresets(active?.presets?.styles || {});
        setLayouts((active?.layouts as Record<string, unknown>) || {});
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
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => key.startsWith('--'))
    ) as CSSProperties;
  }, [config, variablesOnly]);

  return (
    <ActiveThemeVariantsProvider
      componentVariants={componentVariants}
      blockPresets={blockPresets}
      stylePresets={stylePresets}
      layouts={layouts}
    >
      <div className={`site-theme-scope${className ? ` ${className}` : ''}`} style={vars}>
        {children}
      </div>
    </ActiveThemeVariantsProvider>
  );
}
