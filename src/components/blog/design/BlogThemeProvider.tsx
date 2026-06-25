import type { ReactNode } from 'react';
import { getBlogTheme } from '@/lib/theme/getBlogTheme';
import { themeToCssVars } from '@/lib/theme/cssVars';

/**
 * Server component that reads the tenant's blog theme and applies it as CSS
 * variables on a wrapper. Wrap public blog pages with this. Scoped to the blog
 * subtree so it never affects the rest of the CMS.
 */
export default async function BlogThemeProvider({ children }: { children: ReactNode }) {
  const theme = await getBlogTheme();
  const vars = themeToCssVars(theme);
  const isDark = theme.darkMode === 'dark';
  return (
    <div className={`blog-theme-scope ${isDark ? 'dark' : ''}`} style={vars}>
      {children}
    </div>
  );
}
