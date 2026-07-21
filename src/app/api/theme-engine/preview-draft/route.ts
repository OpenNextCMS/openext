import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import { EditDraftStore } from '@/modules/themeEngine/EditDraftStore';

const bodySchema = z.object({
  themeSlug: z.string().min(1),
  pageSlug: z.string().min(1),
  blocks: z.array(z.unknown()),
});

/** POST /api/theme-engine/preview-draft — store a short-lived draft for iframe preview. */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) throw new ApiError('Unauthorized', 401);

    const json = await req.json();
    const body = bodySchema.parse(json);
    const key = EditDraftStore.put({
      themeSlug: body.themeSlug,
      pageSlug: body.pageSlug,
      blocks: body.blocks,
    });
    return apiOk({ draftKey: key });
  } catch (err) {
    return handleApiError(err);
  }
}
