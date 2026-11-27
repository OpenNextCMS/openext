import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireRbac, assertResourceOwnership } from '@/lib/rbac';

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireRbac();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const page = await PageModel.findById(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, message: 'Page not found' }, { status: 404 });
    }

    assertResourceOwnership({
      role: ctx.role,
      ownerId: page.createdBy,
      userId: ctx.user.userId,
      editAllCap: 'pages.delete.all',
      editOwnCap: 'pages.delete.own',
    });

    await PageModel.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Page deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
