import type { ReactNode } from 'react';
import { getActiveTheme } from '@/lib/theme/theme-loader';
import { themeConfigToCssVars } from '@/lib/theme/cssVars.site';

/**
 * Server component that reads the tenant's ACTIVE site theme and applies it as
 * CSS variables on a wrapper around the public page content. Public blocks read
 * these via `var(--token, <fallback>)`, so unstyled blocks adopt the theme while
 * per-block inline styles still win.
 *
 * The public-site counterpart to the blog's `BlogThemeProvider`. Used at the
 * `[slug]` page level (NOT the root layout) so the dashboard is never themed.
 */
export default async function SiteThemeProvider({ children }: { children: ReactNode }) {
  const active = await getActiveTheme();
  const vars = themeConfigToCssVars(active.config);
  return (
    <div className="site-theme-scope" style={vars}>
      {children}
    </div>
  );
}
