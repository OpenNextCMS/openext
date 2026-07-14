import type { ReactNode } from 'react';
import { ThemeLoader } from '@/modules/theme/services/ThemeLoader';
import { themeConfigToCssVars } from '@/lib/theme/cssVars.site';
import { ActiveThemeVariantsProvider } from '@/providers/ActiveThemeVariantsProvider';

/**
 * Server component that reads the tenant's ACTIVE site theme and applies it as
 * CSS variables on a wrapper around the public page content. Public blocks read
 * these via `var(--token, <fallback>)`, so unstyled blocks adopt the theme while
 * per-block inline styles still win.
 *
 * Also exposes `componentVariants` + package presets/layouts to client
 * `RenderBlock` / builder helpers.
 *
 * Package themes additionally inject their global CSS from /theme-assets/{slug}/….
 */
export default async function SiteThemeProvider({ children }: { children: ReactNode }) {
  const active = await ThemeLoader.getActive();
  const vars = themeConfigToCssVars(active.config);
  return (
    <ActiveThemeVariantsProvider
      componentVariants={active.componentVariants}
      blockPresets={active.presets.blocks}
      stylePresets={active.presets.styles}
      layouts={active.layouts}
      cssUrls={active.cssUrls}
    >
      {active.cssUrls.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div className="site-theme-scope" style={vars}>
        {children}
      </div>
    </ActiveThemeVariantsProvider>
  );
}
