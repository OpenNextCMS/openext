import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { requireSocialMediaActive } from '@/lib/social-media/lifecycle';
import {
  createSocialMediaPost,
  listSocialMediaPosts,
} from '@/lib/social-media/service';
import type { ISocialMediaPost, SocialPlatformId, SocialPostStatus } from '@/types/social-media';

/** GET /api/social-media/posts */
export async function GET() {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const posts = await listSocialMediaPosts();
    return apiOk(posts);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/social-media/posts */
export async function POST(req: NextRequest) {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const body = (await req.json().catch(() => null)) as Partial<ISocialMediaPost> | null;
    if (!body || typeof body.title !== 'string' || typeof body.url !== 'string') {
      throw new ApiError('title and url are required', 400);
    }
    if (!body.title.trim() || !body.url.trim()) {
      throw new ApiError('title and url cannot be empty', 400);
    }

    const post = await createSocialMediaPost({
      title: body.title,
      url: body.url,
      message: typeof body.message === 'string' ? body.message : '',
      platforms: Array.isArray(body.platforms) ? (body.platforms as SocialPlatformId[]) : [],
      status: (body.status as SocialPostStatus) || 'draft',
      scheduledAt: body.scheduledAt || null,
    });
    return apiOk(post, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
