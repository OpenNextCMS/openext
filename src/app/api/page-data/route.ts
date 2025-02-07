import { NextRequest, NextResponse } from 'next/server';
import { getPageDb, getPageModel } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    // Ensure the page database connection is initialized
    await getPageDb();

    const PageModel = getPageModel();
    const pageData = await PageModel.findOne({ pageName: 'Welcome Page' });

    if (!pageData) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(pageData);
  } catch (error: any) {
    console.error('Error fetching page data:', error); // Log the error
    return NextResponse.json({ error: error.message || 'Failed to fetch page data' }, { status: 500 });
  }
}
