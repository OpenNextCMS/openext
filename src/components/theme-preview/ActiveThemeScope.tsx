'use client';
import { apiUrl } from '@/lib/apiClient';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { themeConfigToCssVars, mergeThemeConfig } from '@/lib/theme/cssVars.site';
import { themeApi } from '@/components/theme-builder/api';
import { ActiveThemeVariantsProvider } from '@/providers/ActiveThemeVariantsProvider';
import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Client-side counterpart to the server `SiteThemeProvider` used on public pages.
 * Loads the active Theme Builder theme AND the active Theme Engine package CSS
 * so editable CMS sections on the canvas can match the live Theme Engine look.
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
  const [engineStylesheetUrl, setEngineStylesheetUrl] = useState<string | null>(null);
  const [engineSlug, setEngineSlug] = useState<string | null>(null);

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

    // Theme Engine (Beta) active package stylesheet for editable-section parity.
    fetch(apiUrl('/api/theme-engine/themes'), { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data as { activeSlug?: string | null } | null;
      })
      .then((data) => {
        if (!alive || !data?.activeSlug) return;
        const slug = data.activeSlug;
        setEngineSlug(slug);
        // Cache-bust lightly; AssetManager also appends hashes when served via ThemeLoader.
        setEngineStylesheetUrl(
          apiUrl(
            `/theme-engine-assets/${encodeURIComponent(slug)}/assets/style.css?editor=1`
          )
        );
      })
      .catch(() => {
        // Theme Engine may be unused — ignore.
      });

    return () => {
      alive = false;
    };
  }, []);

  const vars = useMemo(() => {
    if (!config) return undefined;
    const all = themeConfigToCssVars(config);
    // When a Theme Engine package is active, its stylesheet + cms-blocks mapping
    // own the color tokens. Theme Builder --color-* would otherwise wash out the look.
    const filtered = engineSlug
      ? Object.fromEntries(
          Object.entries(all).filter(
            ([key]) =>
              key.startsWith('--') &&
              !key.startsWith('--color-') &&
              !key.startsWith('--font-')
          )
        )
      : variablesOnly
        ? Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith('--')))
        : all;
    return filtered as CSSProperties;
  }, [config, variablesOnly, engineSlug]);

  const scopeClass = [
    'site-theme-scope',
    engineSlug ? 'theme-engine-cms-scope ct-page ct-page--cms-blocks' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ActiveThemeVariantsProvider
      componentVariants={componentVariants}
      blockPresets={blockPresets}
      stylePresets={stylePresets}
      layouts={layouts}
    >
      {engineStylesheetUrl ? (
        <link rel="stylesheet" href={engineStylesheetUrl} data-theme-engine-editor-css={engineSlug || ''} />
      ) : null}
      {/* Bridge package tokens → CMS block CSS vars (works for --ct-* and common aliases). */}
      {engineSlug ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `
.theme-engine-cms-scope {
  --color-primary: var(--ct-accent, var(--theme-accent, #2cc8c6));
  --color-secondary: var(--ct-panel, var(--theme-panel, #272d3f));
  --color-bg: var(--ct-bg, var(--theme-bg, #1f2433));
  --color-surface: var(--ct-panel, var(--theme-panel, #272d3f));
  --color-text: var(--ct-text, var(--theme-text, #f5f7ff));
  --color-muted: var(--ct-muted, var(--theme-muted, #c2c8dd));
  background: var(--color-bg);
  color: var(--color-text);
}
.theme-engine-cms-scope .text-gray-600,
.theme-engine-cms-scope .body-font {
  color: inherit;
}
.theme-engine-cms-scope .bg-indigo-100 {
  background-color: rgba(44, 200, 198, 0.15);
}
`,
          }}
        />
      ) : null}
      <div className={scopeClass} style={vars} data-theme-engine-slug={engineSlug || undefined}>
        {children}
      </div>
    </ActiveThemeVariantsProvider>
  );
}
