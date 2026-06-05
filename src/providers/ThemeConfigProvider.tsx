'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { themeConfigToCssVars } from '@/lib/theme/cssVars.site';
import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';
import type { CSSProperties } from 'react';

/**
 * Client context exposing the Theme Builder's working draft + derived CSS vars,
 * for the builder UI and live preview to consume. Backed by the
 * `themeBuilder` Redux slice (the single source of truth for the draft).
 *
 * Named `ThemeConfig*` to avoid colliding with the existing light/dark
 * `useTheme` in `src/context/ThemeContext.tsx`, which is untouched.
 */
interface ThemeConfigContextValue {
  theme: ThemeConfig;
  currentTheme: ThemeConfig; // alias for spec parity
  componentVariants: ComponentVariants;
  cssVars: CSSProperties;
}

const ThemeConfigContext = createContext<ThemeConfigContextValue | undefined>(undefined);

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const draft = useSelector((s: RootState) => s.themeBuilder.draft);
  const componentVariants = useSelector((s: RootState) => s.themeBuilder.componentVariants);

  const value = useMemo<ThemeConfigContextValue>(
    () => ({
      theme: draft,
      currentTheme: draft,
      componentVariants,
      cssVars: themeConfigToCssVars(draft),
    }),
    [draft, componentVariants]
  );

  return <ThemeConfigContext.Provider value={value}>{children}</ThemeConfigContext.Provider>;
}

export function useThemeConfig(): ThemeConfigContextValue {
  const ctx = useContext(ThemeConfigContext);
  if (!ctx) {
    throw new Error('useThemeConfig must be used within a ThemeConfigProvider');
  }
  return ctx;
}
