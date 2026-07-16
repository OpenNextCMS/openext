import type { ThemeDocument, ThemeManifest } from './types';

/**
 * §4.5 ThemeCache — process-level cache for parsed manifests and dynamically
 * imported component modules.
 *
 * Key convention (spec §4.5):
 *     `${themeSlug}@${manifest.version}::${relativeComponentPath}`
 * The VERSION is embedded so an in-place theme upgrade can never serve a stale
 * cached component even when the slug is unchanged.
 *
 * ── Multi-instance deployments ────────────────────────────────────────────────
 * This cache is PROCESS-LOCAL. In a horizontally scaled deployment each instance
 * holds its own copy, so each must independently learn that the active theme
 * changed. The spec requires documenting both supported options rather than
 * silently picking one — BOTH are supported here and neither is forced:
 *
 *   Option A — TTL safety net (default OFF; enable with `ttlMs`, e.g. 10_000).
 *     Entries self-expire, so an activation propagates to every instance within
 *     at most `ttlMs`. Zero infrastructure; costs a re-import per TTL window.
 *
 *   Option B — pub/sub invalidation (near-instant, no polling).
 *     Wire a Mongo change stream on `theme_settings` (or Redis pub/sub) to this
 *     cache using `onInvalidate()` to PUBLISH local invalidations, and
 *     `applyRemote()` to APPLY ones received from peers. `applyRemote()` does not
 *     re-emit, which prevents publish loops between instances.
 *
 * Single-instance deployments need neither: `ThemeRegistry.activate()` calls
 * `invalidateActive()` in-process after the transaction commits.
 */

/** An invalidation event, emitted locally and (optionally) published to peers. */
export type ThemeCacheInvalidation =
  | { type: 'theme'; slug: string }
  | { type: 'active' }
  | { type: 'all' };

export type ThemeCacheListener = (event: ThemeCacheInvalidation) => void;

export interface ThemeCacheOptions {
  /**
   * Option A — TTL for cached entries in ms. `0` (default) disables expiry,
   * which is correct for single-instance deployments.
   */
  ttlMs?: number;
}

export interface ThemeCacheStats {
  manifests: number;
  componentModules: number;
  hasActive: boolean;
  generation: number;
  ttlMs: number;
}

interface Entry<T> {
  value: T;
  /** Epoch ms after which the entry is stale; `null` = never expires. */
  expiresAt: number | null;
}

export class ThemeCache {
  private manifests = new Map<string, Entry<ThemeManifest>>();
  private modules = new Map<string, Entry<unknown>>();
  /** Reverse index: slug -> component cache keys, for O(k) `invalidateTheme`. */
  private slugIndex = new Map<string, Set<string>>();
  /** The resolved active theme document (cleared by `invalidateActive`). */
  private active: Entry<ThemeDocument | null> | undefined;
  private listeners = new Set<ThemeCacheListener>();
  private gen = 0;
  private readonly ttlMs: number;

  constructor(options: ThemeCacheOptions = {}) {
    this.ttlMs = Math.max(0, options.ttlMs ?? 0);
  }

  /**
   * Build a component cache key. The ONLY supported way to construct one, so the
   * version can never be accidentally omitted.
   */
  static componentKey(themeSlug: string, version: string, relativeComponentPath: string): string {
    return `${themeSlug}@${version}::${relativeComponentPath}`;
  }

  /** Slug portion of a component key (`slug@version::path` -> `slug`). */
  private static slugOf(cacheKey: string): string {
    const at = cacheKey.indexOf('@');
    return at === -1 ? cacheKey : cacheKey.slice(0, at);
  }

  private expiry(): number | null {
    return this.ttlMs > 0 ? Date.now() + this.ttlMs : null;
  }

  private fresh<T>(entry: Entry<T> | undefined): entry is Entry<T> {
    if (!entry) return false;
    return entry.expiresAt === null || entry.expiresAt > Date.now();
  }

  /* ---------------- manifests ---------------- */

  getManifest(slug: string): ThemeManifest | undefined {
    const entry = this.manifests.get(slug);
    if (!this.fresh(entry)) {
      if (entry) this.manifests.delete(slug);
      return undefined;
    }
    return entry.value;
  }

  setManifest(slug: string, manifest: ThemeManifest): void {
    this.manifests.set(slug, { value: manifest, expiresAt: this.expiry() });
  }

  /* ---------------- component modules ---------------- */

  getComponentModule(cacheKey: string): unknown | undefined {
    const entry = this.modules.get(cacheKey);
    if (!this.fresh(entry)) {
      if (entry) this.dropModule(cacheKey);
      return undefined;
    }
    return entry.value;
  }

  setComponentModule(cacheKey: string, mod: unknown): void {
    this.modules.set(cacheKey, { value: mod, expiresAt: this.expiry() });
    const slug = ThemeCache.slugOf(cacheKey);
    let keys = this.slugIndex.get(slug);
    if (!keys) {
      keys = new Set<string>();
      this.slugIndex.set(slug, keys);
    }
    keys.add(cacheKey);
  }

  private dropModule(cacheKey: string): void {
    this.modules.delete(cacheKey);
    const slug = ThemeCache.slugOf(cacheKey);
    const keys = this.slugIndex.get(slug);
    if (keys) {
      keys.delete(cacheKey);
      if (keys.size === 0) this.slugIndex.delete(slug);
    }
  }

  /* ---------------- active-theme slot ---------------- */

  /**
   * The cached active `ThemeDocument` (or `null` meaning "no active theme").
   * Returns `undefined` when nothing is cached / it expired — callers must then
   * re-read from the registry. (`null` and `undefined` are deliberately distinct.)
   */
  getActive(): ThemeDocument | null | undefined {
    if (!this.fresh(this.active)) {
      this.active = undefined;
      return undefined;
    }
    return this.active.value;
  }

  setActive(doc: ThemeDocument | null): void {
    this.active = { value: doc, expiresAt: this.expiry() };
  }

  /* ---------------- invalidation ---------------- */

  /** Drop a theme's manifest and every cached component module (all versions). */
  invalidateTheme(slug: string): void {
    this.applyTheme(slug);
    this.emit({ type: 'theme', slug });
  }

  /**
   * Drop the cached active-theme pointer. Called by `ThemeRegistry.activate()`
   * AFTER the transaction commits (never before — spec §4.4).
   */
  invalidateActive(): void {
    this.applyActive();
    this.emit({ type: 'active' });
  }

  invalidateAll(): void {
    this.applyAll();
    this.emit({ type: 'all' });
  }

  /* ---------------- pub/sub seam (Option B) ---------------- */

  /** Subscribe to local invalidations so an adapter can publish them to peers. */
  onInvalidate(listener: ThemeCacheListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Apply an invalidation received FROM a peer. Deliberately does not re-emit,
   * so peers cannot ping-pong invalidations forever.
   */
  applyRemote(event: ThemeCacheInvalidation): void {
    switch (event.type) {
      case 'theme':
        this.applyTheme(event.slug);
        break;
      case 'active':
        this.applyActive();
        break;
      case 'all':
        this.applyAll();
        break;
    }
  }

  /* ---------------- introspection ---------------- */

  /** Bumped on every invalidation — lets callers cheaply detect staleness. */
  get generation(): number {
    return this.gen;
  }

  stats(): ThemeCacheStats {
    return {
      manifests: this.manifests.size,
      componentModules: this.modules.size,
      hasActive: this.active !== undefined,
      generation: this.gen,
      ttlMs: this.ttlMs,
    };
  }

  /* ---------------- internals ---------------- */

  private applyTheme(slug: string): void {
    this.manifests.delete(slug);
    const keys = this.slugIndex.get(slug);
    if (keys) {
      for (const key of keys) this.modules.delete(key);
      this.slugIndex.delete(slug);
    }
    // A theme change may also invalidate the active pointer if it IS the active theme.
    if (this.active && this.active.value?.slug === slug) this.active = undefined;
    this.gen++;
  }

  private applyActive(): void {
    this.active = undefined;
    this.gen++;
  }

  private applyAll(): void {
    this.manifests.clear();
    this.modules.clear();
    this.slugIndex.clear();
    this.active = undefined;
    this.gen++;
  }

  private emit(event: ThemeCacheInvalidation): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // A broken subscriber must never break cache invalidation.
        console.warn('[themeEngine] ThemeCache listener threw:', err instanceof Error ? err.message : err);
      }
    }
  }
}

/**
 * Process-wide singleton, pinned to `globalThis` so Next.js dev HMR (which
 * re-evaluates modules) cannot create duplicate caches that drift apart.
 *
 * Set `THEME_ENGINE_CACHE_TTL_MS` to enable Option A (e.g. `10000`).
 */
const globalRef = globalThis as unknown as { __themeEngineCache?: ThemeCache };
export const themeCache: ThemeCache =
  globalRef.__themeEngineCache ??
  new ThemeCache({ ttlMs: Number(process.env.THEME_ENGINE_CACHE_TTL_MS) || 0 });
if (!globalRef.__themeEngineCache) globalRef.__themeEngineCache = themeCache;
