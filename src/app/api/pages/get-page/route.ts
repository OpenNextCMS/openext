import { NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSlug = searchParams.get('name');

    if (!pageSlug) {
      return NextResponse.json({ error: 'Missing pageSlug' }, { status: 400 });
    }

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const page = await PageModel.findOne({ slug: pageSlug }).lean().exec();

    return NextResponse.json({ page }, { status: 200 });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
