/**
 * Tiny process-local TTL cache for hot Settings reads on public page renders.
 * Invalidate on Settings writes so dashboard changes show up quickly.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCachedValue<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}

export function invalidateSettingsCache(): void {
  store.clear();
  inFlight.clear();
}

/** Single-flight fetch with TTL — concurrent misses share one promise. */
export async function getOrLoadCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = getCachedValue<T>(key);
  if (hit !== undefined) return hit;

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await loader();
      setCachedValue(key, value, ttlMs);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/** Default TTL for public Settings / language config (env-overridable). */
export function settingsCacheTtlMs(): number {
  const raw = Number(process.env.SETTINGS_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 15_000;
}
