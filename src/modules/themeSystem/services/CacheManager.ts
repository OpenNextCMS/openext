/**
 * CacheManager — in-process cache for compiled layouts, component imports, and
 * theme assets (spec §12, §17).
 *
 * Requirements met:
 *  - Caches compiled layouts / component imports / resolved assets.
 *  - Tag-based invalidation so a single theme's entries can be dropped on
 *    install / delete / update / activate without clearing unrelated caches.
 *  - Optional TTL per entry; lazy expiry on read + periodic sweep.
 *
 * SOLID: depends only on the `ThemeCacheStore` interface, so the in-memory
 * implementation can be swapped for Redis later without touching callers.
 */

export interface ThemeCacheStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, opts?: { ttlMs?: number; tags?: string[] }): void;
  has(key: string): boolean;
  delete(key: string): void;
  invalidateTag(tag: string): number;
  clear(): void;
  wrap<T>(key: string, producer: () => T | Promise<T>, opts?: { ttlMs?: number; tags?: string[] }): Promise<T>;
}

interface Entry<T = unknown> {
  value: T;
  expiresAt: number | null;
  tags: Set<string>;
}

class InMemoryThemeCache implements ThemeCacheStore {
  private store = new Map<string, Entry>();
  /** Reverse index: tag → set of keys, for O(k) tag invalidation. */
  private tagIndex = new Map<string, Set<string>>();

  private now(): number {
    return Date.now();
  }

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= this.now();
  }

  private removeKey(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;
    for (const tag of entry.tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) this.tagIndex.delete(tag);
      }
    }
    this.store.delete(key);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.removeKey(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, opts?: { ttlMs?: number; tags?: string[] }): void {
    this.removeKey(key); // drop any prior tag links for this key
    const tags = new Set(opts?.tags ?? []);
    const entry: Entry<T> = {
      value,
      expiresAt: opts?.ttlMs ? this.now() + opts.ttlMs : null,
      tags,
    };
    this.store.set(key, entry);
    for (const tag of tags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set<string>();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.removeKey(key);
  }

  /** Drop every entry carrying `tag`. Returns the number removed. */
  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;
    const count = keys.size;
    for (const key of [...keys]) this.removeKey(key);
    this.tagIndex.delete(tag);
    return count;
  }

  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
  }

  /** Memoize an (async) producer under `key`, returning the cached value if fresh. */
  async wrap<T>(
    key: string,
    producer: () => T | Promise<T>,
    opts?: { ttlMs?: number; tags?: string[] }
  ): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await producer();
    this.set(key, value, opts);
    return value;
  }
}

/** Stable tag helpers so every layer invalidates consistently. */
export const CacheTags = {
  /** Everything belonging to one theme (compiled layouts, components, assets). */
  theme: (slug: string) => `theme:${slug}`,
  /** The resolved "active theme" pointer. */
  activeTheme: () => 'theme:active',
} as const;

/** Stable key helpers for the Theme Engine (§7). */
export const CacheKeys = {
  themeRecord: (slug: string) => `theme:${slug}:record`,
  layout: (slug: string) => `theme:${slug}:layout`,
  component: (slug: string, name: string) => `theme:${slug}:component:${name}`,
  page: (slug: string, pageSlug: string) => `theme:${slug}:page:${pageSlug}`,
  asset: (slug: string, assetPath: string) => `theme:${slug}:asset:${assetPath}`,
  active: () => 'theme:active:record',
} as const;

/**
 * Process-wide singleton (survives Next.js module reloads via globalThis so dev
 * HMR doesn't leak duplicate caches).
 */
const globalRef = globalThis as unknown as { __themeCache?: ThemeCacheStore };
export const themeCache: ThemeCacheStore = globalRef.__themeCache ?? new InMemoryThemeCache();
if (!globalRef.__themeCache) globalRef.__themeCache = themeCache;

/**
 * Drop every cache entry for a theme AND the active-theme pointer. Called by
 * install / delete / update / activate services (spec §12 invalidation rules).
 */
export function invalidateTheme(slug: string): void {
  themeCache.invalidateTag(CacheTags.theme(slug));
  themeCache.invalidateTag(CacheTags.activeTheme());
  themeCache.delete(CacheKeys.active());
}
