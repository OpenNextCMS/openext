import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, pageID, updatedComponents, ...updateFields } = data;
    console.log('Page-ID', pageID);
    if (!pageID || !userId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Get dynamic DB connection
    const pageDb = await getPageDbConnection();
    
    // Get PageModel using the connection
    const PageModel = getPageModel(pageDb);
    if(updateFields.isHome) await PageModel.updateMany({ isHome: true }, { $set: { isHome: false } });

    const _id = pageID;
    // Find page
    const page = await PageModel.findOne({ _id, createdBy: userId });
    console.log('Page:', page);

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }
    Object.assign(page, updateFields);
    // Update components
    page.component = updatedComponents || page.component;
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
