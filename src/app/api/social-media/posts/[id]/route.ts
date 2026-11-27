import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { requireSocialMediaActive } from '@/lib/social-media/lifecycle';
import {
  deleteSocialMediaPost,
  updateSocialMediaPost,
} from '@/lib/social-media/service';
import type { ISocialMediaPost } from '@/types/social-media';

/** PATCH /api/social-media/posts/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const { id } = await params;
    if (!id) throw new ApiError('Post id is required', 400);

    const body = (await req.json().catch(() => null)) as Partial<ISocialMediaPost> | null;
    if (!body || typeof body !== 'object') {
      throw new ApiError('Invalid payload', 400);
    }

    const updated = await updateSocialMediaPost(id, body);
    if (!updated) throw new ApiError('Post not found', 404);
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/social-media/posts/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCapability('components.social-media');
    await requireSocialMediaActive();
    const { id } = await params;
    if (!id) throw new ApiError('Post id is required', 400);
    const ok = await deleteSocialMediaPost(id);
    if (!ok) throw new ApiError('Post not found', 404);
    return apiOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
