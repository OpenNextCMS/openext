import { NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireAnyCapability, hasCapability } from '@/lib/rbac';

/** List fields only — page bodies (`component`) are loaded in the editor via get-page. */
const PAGE_LIST_SELECT =
  '_id pageName slug pageType isPublished isHome isGlobal locale translationGroupId createdBy createdAt updatedAt seoName description';

export async function GET() {
  try {
    const ctx = await requireAnyCapability('pages.view');
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const query =
      hasCapability(ctx.role, 'pages.edit.all') || hasCapability(ctx.role, 'pages.delete.all')
        ? {}
        : { createdBy: ctx.user.userId };

    const pages = await PageModel.find(query)
      .select(PAGE_LIST_SELECT)
      .sort({ updatedAt: -1 })
      .limit(1000)
      .lean()
      .exec();

    return NextResponse.json({ userId: ctx.user.userId, pages }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
