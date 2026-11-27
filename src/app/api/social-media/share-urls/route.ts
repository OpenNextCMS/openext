import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { requireSocialMediaActive } from '@/lib/social-media/lifecycle';
import { getOrCreateSocialMediaSettings } from '@/lib/social-media/service';
import { buildShareUrls } from '@/lib/social-media/shareUrls';
import type { SocialPlatformId } from '@/types/social-media';

/** GET /api/social-media/share-urls?url=&title=&message= */
export async function GET(req: NextRequest) {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    if (!url.trim()) throw new ApiError('url query param is required', 400);

    const title = searchParams.get('title') || '';
    const message = searchParams.get('message') || '';
    const platformsRaw = searchParams.get('platforms');
    const platforms = platformsRaw
      ? (platformsRaw.split(',').map((p) => p.trim()) as SocialPlatformId[])
      : undefined;

    const settings = await getOrCreateSocialMediaSettings();
    const items = buildShareUrls({ url, title, message, platforms, settings });
    return apiOk({ items, settings: { shareDefaults: settings.shareDefaults } });
  } catch (err) {
    return handleApiError(err);
  }
}
