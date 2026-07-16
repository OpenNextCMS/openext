/**
 * HookRegistry — the theme extensibility system (spec §14).
 *
 * Themes register callbacks for lifecycle points; the renderer runs them in
 * registration order. Hooks are scoped per theme slug so switching (or
 * deactivating) a theme cleanly removes its hooks — no leakage between themes.
 *
 * SOLID: open/closed — new behavior is added by registering hooks, never by
 * editing the renderer.
 */

export type HookName =
  | 'beforeRender'
  | 'afterRender'
  | 'beforeHeader'
  | 'afterFooter'
  | 'beforePage'
  | 'afterPage';

/** Context handed to every hook; `payload` is mutable so hooks can augment it. */
export interface HookContext<T = Record<string, unknown>> {
  hook: HookName;
  themeSlug: string;
  pageSlug?: string;
  payload: T;
}

export type HookCallback<T = Record<string, unknown>> = (
  ctx: HookContext<T>
) => void | HookContext<T>['payload'] | Promise<void | HookContext<T>['payload']>;

interface Registration {
  themeSlug: string;
  priority: number;
  callback: HookCallback;
}

const globalRef = globalThis as unknown as { __themeHooks?: Map<HookName, Registration[]> };
const registry: Map<HookName, Registration[]> = globalRef.__themeHooks ?? new Map();
if (!globalRef.__themeHooks) globalRef.__themeHooks = registry;

export const HookRegistry = {
  /** Register a callback for a hook, scoped to a theme. Lower priority runs first. */
  register(hook: HookName, themeSlug: string, callback: HookCallback, priority = 10): void {
    const list = registry.get(hook) ?? [];
    list.push({ themeSlug, callback, priority });
    list.sort((a, b) => a.priority - b.priority);
    registry.set(hook, list);
  },

  /**
   * Run every callback for a hook, threading `payload` through each. A callback
   * may return a replacement payload; errors in one hook never break the chain.
   */
  async run<T extends Record<string, unknown>>(
    hook: HookName,
    themeSlug: string,
    payload: T,
    pageSlug?: string
  ): Promise<T> {
    const list = registry.get(hook);
    if (!list || list.length === 0) return payload;
    let current = payload;
    for (const reg of list) {
      if (reg.themeSlug !== themeSlug) continue;
      try {
        const result = await reg.callback({ hook, themeSlug, pageSlug, payload: current });
        if (result && typeof result === 'object') current = result as T;
      } catch (err) {
        console.warn(`[theme-hook] ${hook} for "${themeSlug}" threw:`, err instanceof Error ? err.message : err);
      }
    }
    return current;
  },

  /** Remove every hook registered by a theme (called on deactivate/delete). */
  clearTheme(themeSlug: string): void {
    for (const [hook, list] of registry) {
      const filtered = list.filter((r) => r.themeSlug !== themeSlug);
      if (filtered.length) registry.set(hook, filtered);
      else registry.delete(hook);
    }
  },

  /** Whether any hooks exist for a theme. */
  has(hook: HookName, themeSlug: string): boolean {
    return (registry.get(hook) ?? []).some((r) => r.themeSlug === themeSlug);
  },
};
