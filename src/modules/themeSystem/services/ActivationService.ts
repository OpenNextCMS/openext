import { ThemeRepository, type InstalledThemeRecord } from '../repositories/ThemeRepository';
import { invalidateTheme, themeCache, CacheKeys } from './CacheManager';
import { ThemeNotFoundError } from '../errors';
import { HookRegistry } from '../hooks/HookRegistry';

/**
 * ActivationService — enforces the single-active-theme invariant (spec §3, §6).
 *
 * Activate = deactivate current → activate selected, atomically. Uses a MongoDB
 * transaction when the deployment supports it (replica set / Atlas); otherwise
 * falls back to ordered sequential writes (the partial-unique index on
 * `active:true` is the DB-level backstop either way).
 *
 * No server restart is required: activation only flips a flag and busts caches;
 * the renderer/loader read the active theme on the next request.
 */
export const ActivationService = {
  async activate(slug: string): Promise<InstalledThemeRecord> {
    const target = await ThemeRepository.findBySlug(slug);
    if (!target) throw new ThemeNotFoundError(slug);

    const previouslyActive = await ThemeRepository.findActive();

    try {
      await ThemeRepository.withSession(async (session) => {
        await ThemeRepository.setActiveExclusive(slug, session);
      });
    } catch (err) {
      // Transactions unsupported (standalone mongod) → ordered fallback.
      if (isTransactionUnsupported(err)) {
        await ThemeRepository.setActiveExclusive(slug);
      } else {
        throw err;
      }
    }

    // Presentation-only switch: drop caches + per-theme hooks so the new theme
    // is picked up immediately, and existing content is never touched (§6).
    if (previouslyActive && previouslyActive.slug !== slug) {
      invalidateTheme(previouslyActive.slug);
      HookRegistry.clearTheme(previouslyActive.slug);
    }
    invalidateTheme(slug);
    themeCache.delete(CacheKeys.active());

    const activated = await ThemeRepository.findBySlug(slug);
    if (!activated) throw new ThemeNotFoundError(slug);
    return activated;
  },

  async deactivate(slug: string): Promise<InstalledThemeRecord> {
    const target = await ThemeRepository.findBySlug(slug);
    if (!target) throw new ThemeNotFoundError(slug);
    await ThemeRepository.updateBySlug(slug, { active: false });
    invalidateTheme(slug);
    themeCache.delete(CacheKeys.active());
    const updated = await ThemeRepository.findBySlug(slug);
    return updated ?? target;
  },

  async getActive(): Promise<InstalledThemeRecord | null> {
    return ThemeRepository.findActive();
  },
};

function isTransactionUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Transaction numbers are only allowed/i.test(msg) ||
    /replica set/i.test(msg) ||
    /transactions are not supported/i.test(msg) ||
    /IllegalOperation/i.test(msg)
  );
}
