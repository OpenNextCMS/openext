import { NextResponse } from 'next/server';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';

export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    if (!pageDb) {
      return NextResponse.json({ success: false, message: 'Database connection error' }, { status: 500 });
    }

    const BlogPostModel = getBlogPostModel(pageDb);

    // Fetch only published blog posts
    const blogPosts = await BlogPostModel.find({ 
      isPublished: true 
    })
    .sort({ publishDate: -1, createdAt: -1 })
    .lean()
    .exec();

    return NextResponse.json({ success: true, pages: blogPosts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public blogs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
