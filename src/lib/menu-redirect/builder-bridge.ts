// Seam between the plugin and the builder/runtime for resolving the "active header".
// This repo has no Zustand `builderStore`; the active header is the global header
// Page (pageType:'header'). Real resolution lives in header-detection.ts (Phase 3);
// this module just pins the contract and provides a typed default.
import type { ResolvedHeader } from '@/types/menu-redirect';

export interface BuilderHeaderBridge {
  /** Header id currently being edited, if the builder exposes one; else null → use the global header. */
  activeHeaderId: string | null;
  /** Patch a menu item's href/attributes live in the builder canvas (Phase 12 wires the real impl). */
  patchMenuItem?: (
    menuItemId: string,
    patch: { href?: string; attributes?: Record<string, string> }
  ) => void;
}

export const defaultBuilderBridge: BuilderHeaderBridge = {
  activeHeaderId: null,
};

export type { ResolvedHeader };
