import type { FilterQuery } from 'mongoose';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import type { IPluginDocument } from '@/types/index';
import { ApiError } from '@/lib/api/errors';
import {
  SOCIAL_MEDIA_PLUGIN_ID,
  SOCIAL_MEDIA_VERSION,
} from './constants';
import type { SocialPluginState } from '@/types/social-media';

/**
 * Lifecycle gate for Social Media Integration. Reuses the Plugin marketplace
 * record: installed = matching Plugin exists; enabled = isActive.
 */

export class SocialPluginNotInstalledError extends ApiError {
  constructor() {
    super('plugin_not_installed', 404);
    this.name = 'SocialPluginNotInstalledError';
  }
}

export class SocialPluginDisabledError extends ApiError {
  constructor() {
    super('plugin_disabled', 409);
    this.name = 'SocialPluginDisabledError';
  }
}

const MATCH: FilterQuery<IPluginDocument> = {
  $or: [
    { pluginId: SOCIAL_MEDIA_PLUGIN_ID },
    { pluginId: { $regex: 'social-media', $options: 'i' } },
    { pluginId: 'market-4' },
    { name: { $regex: 'social media', $options: 'i' } },
    { type: 'social' },
  ],
};

let cache: { state: SocialPluginState; ts: number } | null = null;
const TTL_MS = 5000;

export async function getSocialMediaPluginState(
  opts: { fresh?: boolean } = {}
): Promise<SocialPluginState> {
  if (!opts.fresh && cache && Date.now() - cache.ts < TTL_MS) return cache.state;
  try {
    await getUserDbConnection();
    const Plugin = getPluginModel();
    const doc = (await Plugin.findOne(MATCH).lean().exec()) as
      | { isActive?: boolean; version?: string }
      | null;
    const state: SocialPluginState = doc
      ? {
          installed: true,
          enabled: !!doc.isActive,
          version: doc.version || SOCIAL_MEDIA_VERSION,
        }
      : { installed: false, enabled: false };
    cache = { state, ts: Date.now() };
    return state;
  } catch {
    return { installed: false, enabled: false };
  }
}

export function invalidateSocialMediaPluginStateCache(): void {
  cache = null;
}

export async function requireSocialMediaActive(): Promise<void> {
  const s = await getSocialMediaPluginState({ fresh: true });
  if (!s.installed) throw new SocialPluginNotInstalledError();
  if (!s.enabled) throw new SocialPluginDisabledError();
}
