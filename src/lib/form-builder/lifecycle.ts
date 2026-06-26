import type { FilterQuery } from 'mongoose';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import type { IPluginDocument } from '@/types/index';
import { ApiError } from '@/lib/api/errors';
import { FORM_BUILDER_PLUGIN_ID, FORM_BUILDER_VERSION } from './constants';

/**
 * Lifecycle gate for the Form Builder plugin. Reuses the existing `Plugin`
 * marketplace record:
 *   installed = a matching Plugin record exists
 *   enabled   = that record's isActive is true
 * Tenancy is per-database (the user DB connection is already tenant-scoped).
 * Mirrors the Menu Redirect plugin's lifecycle gate.
 */

export interface FormPluginState {
  installed: boolean;
  enabled: boolean;
  version?: string;
}

export class FormPluginNotInstalledError extends ApiError {
  constructor() {
    super('plugin_not_installed', 404);
    this.name = 'FormPluginNotInstalledError';
  }
}
export class FormPluginDisabledError extends ApiError {
  constructor() {
    super('plugin_disabled', 409);
    this.name = 'FormPluginDisabledError';
  }
}

// Match our canonical pluginId, plus marketplace-install variants and the
// generic type/name so an install via the existing marketplace still counts.
const MATCH: FilterQuery<IPluginDocument> = {
  $or: [
    { pluginId: FORM_BUILDER_PLUGIN_ID },
    { pluginId: { $regex: 'form-builder', $options: 'i' } },
    { name: { $regex: 'form builder', $options: 'i' } },
    { type: 'form' },
  ],
};

let cache: { state: FormPluginState; ts: number } | null = null;
const TTL_MS = 5000;

/** Cached read of the plugin's install/enable state (short TTL). */
export async function getFormPluginState(
  opts: { fresh?: boolean } = {}
): Promise<FormPluginState> {
  if (!opts.fresh && cache && Date.now() - cache.ts < TTL_MS) return cache.state;
  try {
    await getUserDbConnection();
    const Plugin = getPluginModel();
    const doc = (await Plugin.findOne(MATCH).lean().exec()) as
      | { isActive?: boolean; version?: string }
      | null;
    const state: FormPluginState = doc
      ? { installed: true, enabled: !!doc.isActive, version: doc.version || FORM_BUILDER_VERSION }
      : { installed: false, enabled: false };
    cache = { state, ts: Date.now() };
    return state;
  } catch {
    return { installed: false, enabled: false };
  }
}

/** Clear the cache after any lifecycle mutation. */
export function invalidateFormPluginStateCache(): void {
  cache = null;
}

/** Throw unless the plugin is installed AND enabled. Call FIRST in every route. */
export async function requireFormBuilderActive(): Promise<void> {
  const s = await getFormPluginState({ fresh: true });
  if (!s.installed) throw new FormPluginNotInstalledError();
  if (!s.enabled) throw new FormPluginDisabledError();
}

/** Resolve the Plugin record's pluginId (for mutations), or null if absent. */
export async function getFormPluginRecordId(): Promise<string | null> {
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
