'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ComponentVariants } from '@/types/component-variants';

export interface ActiveThemePackageContextValue {
  componentVariants: ComponentVariants;
  /** Block presets from the active package (blocks/*.json). */
  blockPresets: Record<string, unknown>;
  /** Style presets (presets/*.json). */
  stylePresets: Record<string, unknown>;
  /** Named layouts (layouts/*.json) — default layout key is often "default". */
  layouts: Record<string, unknown>;
  /** Public CSS asset URLs for the active package theme. */
  cssUrls: string[];
}

const DEFAULT_VALUE: ActiveThemePackageContextValue = {
  componentVariants: {},
  blockPresets: {},
  stylePresets: {},
  layouts: {},
  cssUrls: [],
};

/**
 * Provides the active theme's `componentVariants` (+ package presets/layouts)
 * to client renderers (`RenderBlock`). Public pages get this from the server
 * `SiteThemeProvider`; the editor canvas gets it from `ActiveThemeScope`.
 */
const ActiveThemeVariantsContext = createContext<ActiveThemePackageContextValue>(DEFAULT_VALUE);

export function ActiveThemeVariantsProvider({
  componentVariants,
  blockPresets,
  stylePresets,
  layouts,
  cssUrls,
  children,
}: {
  componentVariants: ComponentVariants;
  blockPresets?: Record<string, unknown>;
  stylePresets?: Record<string, unknown>;
  layouts?: Record<string, unknown>;
  cssUrls?: string[];
  children: ReactNode;
}) {
  const value: ActiveThemePackageContextValue = {
    componentVariants: componentVariants || {},
    blockPresets: blockPresets || {},
    stylePresets: stylePresets || {},
    layouts: layouts || {},
    cssUrls: cssUrls || [],
  };
  return (
    <ActiveThemeVariantsContext.Provider value={value}>{children}</ActiveThemeVariantsContext.Provider>
  );
}

/** Section layout choices for the active theme. */
export function useActiveThemeVariants(): ComponentVariants {
  return useContext(ActiveThemeVariantsContext).componentVariants;
}

/** Full package context (presets, layouts, CSS URLs). */
export function useActiveThemePackage(): ActiveThemePackageContextValue {
  return useContext(ActiveThemeVariantsContext);
}

/** Default layout JSON from the active package, if any. */
export function useActiveThemeDefaultLayout(): unknown | null {
  const { layouts } = useContext(ActiveThemeVariantsContext);
  if (layouts.default !== undefined) return layouts.default;
  const first = Object.keys(layouts)[0];
  return first ? layouts[first] : null;
}
