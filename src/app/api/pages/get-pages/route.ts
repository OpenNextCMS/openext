import {  NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const pages = await PageModel.find({}).lean().exec();
    return NextResponse.json(pages, { status: 200 });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
