import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { requireSocialMediaActive } from '@/lib/social-media/lifecycle';
import {
  getOrCreateSocialMediaSettings,
  updateSocialMediaSettings,
} from '@/lib/social-media/service';
import type { ISocialMediaSettings } from '@/types/social-media';

/** GET /api/social-media/settings */
export async function GET() {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const settings = await getOrCreateSocialMediaSettings();
    return apiOk(settings);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/social-media/settings */
export async function PUT(req: NextRequest) {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const body = (await req.json().catch(() => null)) as Partial<ISocialMediaSettings> | null;
    if (!body || typeof body !== 'object') {
      throw new ApiError('Invalid settings payload', 400);
    }
    const settings = await updateSocialMediaSettings(body);
    return apiOk(settings);
  } catch (err) {
    return handleApiError(err);
  }
}
