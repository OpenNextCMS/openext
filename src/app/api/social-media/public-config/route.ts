import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { getSocialMediaPluginState } from '@/lib/social-media/lifecycle';
import { getOrCreateSocialMediaSettings } from '@/lib/social-media/service';
import {
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_LABELS,
} from '@/lib/social-media/constants';

/**
 * GET /api/social-media/public-config
 * Public read of connected platforms + default button style for the share block.
 * Only available when the Social Media plugin is installed and enabled.
 */
export async function GET() {
  try {
    const state = await getSocialMediaPluginState({ fresh: true });
    if (!state.installed || !state.enabled) {
      throw new ApiError('Social Media Integration is not available', 404);
    }

    const settings = await getOrCreateSocialMediaSettings();
    const platforms = SOCIAL_PLATFORM_IDS.filter((id) => {
      const cfg = settings.platforms[id];
      return cfg?.enabled && !!cfg.profileUrl?.trim();
    }).map((id) => ({
      id,
      label: SOCIAL_PLATFORM_LABELS[id],
      profileUrl: settings.platforms[id].profileUrl.trim(),
      shareEnabled: !!settings.platforms[id].shareEnabled,
    }));

    return apiOk({
      platforms,
      buttonStyle: settings.shareDefaults.buttonStyle,
      shareDefaults: settings.shareDefaults,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
