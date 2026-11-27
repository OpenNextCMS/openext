import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { assertResourceOwnership, requireRbac } from '@/lib/rbac';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { ThemeEngineEditorApplyService } from '@/modules/themeEngine/ThemeEngineEditorApplyService';

const bodySchema = z
  .object({
    pageId: z.string().min(1).optional(),
    pageSlug: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.pageId || v.pageSlug), {
    message: 'pageId or pageSlug is required',
  });

/**
 * POST /api/theme-engine/editor/remove
 * Detach Theme Engine from the page editor and restore the classic block canvas.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRbac();
    const json = await req.json().catch(() => ({}));
    const { pageId, pageSlug } = bodySchema.parse(json ?? {});

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);
    const page = pageId
      ? await PageModel.findById(pageId).exec()
      : await PageModel.findOne({ slug: pageSlug }).exec();

    if (!page) {
      throw new ApiError('Page not found', 404);
    }

    assertResourceOwnership({
      role: ctx.role,
      ownerId: page.createdBy,
      userId: ctx.user.userId,
      editAllCap: 'pages.edit.all',
      editOwnCap: 'pages.edit.own',
    });

    const result = await ThemeEngineEditorApplyService.removeFromPage({
      pageId: pageId || String(page._id),
      pageSlug,
      userId: ctx.user.userId,
    });

    return apiOk(result);
  } catch (err) {
    return handleApiError(err instanceof ApiError ? err : err);
  }
}
