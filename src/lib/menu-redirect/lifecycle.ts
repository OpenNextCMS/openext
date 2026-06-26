import type { FilterQuery } from 'mongoose';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import type { IPluginDocument } from '@/types/index';
import { ApiError } from '@/lib/api/errors';
import { MENU_REDIRECT_PLUGIN_ID, MENU_REDIRECT_VERSION, DEFAULT_PLUGIN_SETTINGS } from './constants';
import type { PluginState } from '@/types/menu-redirect';

/**
 * Lifecycle gate. Reuses the existing `Plugin` marketplace record:
 *   installed = a matching Plugin record exists
 *   enabled   = that record's isActive is true
 * Tenancy is per-database (the user DB connection is already tenant-scoped).
 */

export class PluginNotInstalledError extends ApiError {
  constructor() {
    super('plugin_not_installed', 404);
    this.name = 'PluginNotInstalledError';
  }
}
export class PluginDisabledError extends ApiError {
  constructor() {
    super('plugin_disabled', 409);
    this.name = 'PluginDisabledError';
  }
}

// Match our canonical pluginId, plus marketplace-install variants and the
// generic type/name so an install via the existing marketplace still counts.
const MATCH: FilterQuery<IPluginDocument> = {
  $or: [
    { pluginId: MENU_REDIRECT_PLUGIN_ID },
    { pluginId: { $regex: 'menu-redirect', $options: 'i' } },
    { name: { $regex: 'menu redirect', $options: 'i' } },
    { type: 'menu' },
  ],
};

let cache: { state: PluginState; ts: number } | null = null;
const TTL_MS = 5000;

/** Cached read of the plugin's install/enable state (short TTL). */
export async function getPluginState(opts: { fresh?: boolean } = {}): Promise<PluginState> {
  if (!opts.fresh && cache && Date.now() - cache.ts < TTL_MS) return cache.state;
  try {
    await getUserDbConnection();
    const Plugin = getPluginModel();
    const doc = (await Plugin.findOne(MATCH).lean().exec()) as
      | { isActive?: boolean; version?: string }
      | null;
    const state: PluginState = doc
      ? {
          installed: true,
          enabled: !!doc.isActive,
          version: doc.version || MENU_REDIRECT_VERSION,
          settings: DEFAULT_PLUGIN_SETTINGS,
        }
      : { installed: false, enabled: false };
    cache = { state, ts: Date.now() };
    return state;
  } catch {
    return { installed: false, enabled: false };
  }
}

/** Clear the cache after any lifecycle mutation. */
export function invalidatePluginStateCache(): void {
  cache = null;
}

/** Throw unless the plugin is installed AND enabled. Call FIRST in every plugin route. */
export async function requirePluginActive(): Promise<void> {
  const s = await getPluginState({ fresh: true });
  if (!s.installed) throw new PluginNotInstalledError();
  if (!s.enabled) throw new PluginDisabledError();
}

/** Lighter guard for the lifecycle enable/status routes themselves. */
export async function requirePluginInstalled(): Promise<void> {
  const s = await getPluginState({ fresh: true });
  if (!s.installed) throw new PluginNotInstalledError();
}

/** Resolve the Plugin record's pluginId (for mutations), or null if absent. */
export async function getPluginRecordId(): Promise<string | null> {
  try {
    await getUserDbConnection();
    const Plugin = getPluginModel();
    const doc = (await Plugin.findOne(MATCH).select('pluginId').lean().exec()) as
      | { pluginId?: string }
      | null;
    return doc?.pluginId ?? null;
  } catch {
    return null;
  }
}
