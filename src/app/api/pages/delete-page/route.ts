import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { cookies } from 'next/headers';

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const deletedPage = await PageModel.findByIdAndDelete(id);

    if (!deletedPage) {
      return NextResponse.json({ success: false, message: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Page deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
