import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function PATCH(req: NextRequest) {
  try {
    const { slug, userId, updatedComponents } = await req.json();

    if (!slug || !userId || !updatedComponents) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get dynamic DB connection
    const pageDb = await getPageDbConnection();

    // Get PageModel using the connection
    const PageModel = getPageModel(pageDb);

    // Find page
    const page = await PageModel.findOne({ slug, createdBy: userId });

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    // Update components
    page.component = updatedComponents;
    page.modifications.push({
      modifiedBy: userId,
      modifiedAt: new Date(),
    });

    await page.save();

    return NextResponse.json({ message: 'Page updated successfully', page }, { status: 200 });
  } catch (err) {
    console.error('Mongo Save Error:', err);
    return NextResponse.json({ message: 'Failed to save page', error: err }, { status: 500 });
  }
}
