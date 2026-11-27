import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const pageDb = await getPageDbConnection();
    if (!pageDb) {
      return NextResponse.json({ success: false, message: 'Database connection error' }, { status: 500 });
    }

    const BlogPostModel = getBlogPostModel(pageDb);
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, Math.floor(limitRaw)), 100)
      : 50;

    // Fetch only published blog posts (capped — never dump the whole collection)
    const blogPosts = await BlogPostModel.find({
      isPublished: true,
    })
      .select(
        'pageName slug excerpt featuredImage category authorName publishDate publishedAt createdAt readingTime views seo locale'
      )
      .sort({ publishDate: -1, createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json({ success: true, pages: blogPosts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public blogs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
