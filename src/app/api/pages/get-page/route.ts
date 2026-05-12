import { NextResponse } from 'next/server';
import { fetchPageWithLayout } from '@/utils/getPageData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSlug = searchParams.get('name');
    const pageKey = searchParams.get('key');

    //USER can define "allowMe"
    if (pageKey !== 'allowMe') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!pageSlug) return NextResponse.json({ error: 'Missing pageSlug' }, { status: 400 });

    const data = await fetchPageWithLayout(pageSlug);

    if (!data) {
      return NextResponse.json({ page: null, header: null, footer: null }, { status: 200 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
