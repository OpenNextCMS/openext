import { NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSlug = searchParams.get('name');
    const pageKey = searchParams.get('key');

    //USER can define "allowMe"
    if (pageKey !== 'allowMe') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!pageSlug) return NextResponse.json({ error: 'Missing pageSlug' }, { status: 400 });

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const page = await PageModel.findOne({ slug: pageSlug }).lean().exec();
    const activeLayoutFilter = {
      isGlobal: true,
      isPublished: true,
    };

    const findActiveLayoutPart = async (pageType: 'header' | 'footer') => {
      if (page?.createdBy) {
        const ownedLayoutPart = await PageModel.findOne({
          ...activeLayoutFilter,
          pageType,
          createdBy: page.createdBy,
        })
          .sort({ updatedAt: -1 })
          .lean()
          .exec();

        if (ownedLayoutPart) return ownedLayoutPart;
      }

      return PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
      })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
    };

    const [header, footer] = await Promise.all([
      findActiveLayoutPart('header'),
      findActiveLayoutPart('footer'),
    ]);

    return NextResponse.json({ page, header, footer }, { status: 200 });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
