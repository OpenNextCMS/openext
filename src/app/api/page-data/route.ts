import { NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function GET() {
  try {
    // Ensure the page database connection is initialized
    await getPageDbConnection();

    const PageModel = getPageModel();
    const pageData = await PageModel.findOne({ pageName: 'Welcome Page' });

    if (!pageData) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(pageData);
  } catch (error: unknown) {
    console.error('Error fetching page data:', error); // Log the error
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch page data';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
