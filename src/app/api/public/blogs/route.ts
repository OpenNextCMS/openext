import { NextResponse } from 'next/server';
<<<<<<< HEAD
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';
=======
import { getPageDbConnection, getPageModel } from '@/utils/db';
>>>>>>> khadija

export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    if (!pageDb) {
      return NextResponse.json({ success: false, message: 'Database connection error' }, { status: 500 });
    }

<<<<<<< HEAD
    const BlogPostModel = getBlogPostModel(pageDb);

    // Fetch only published blog posts
    const blogPosts = await BlogPostModel.find({ 
=======
    const PageModel = getPageModel(pageDb);

    // Fetch only published blog posts
    const blogPosts = await PageModel.find({ 
      pageType: 'blog', 
>>>>>>> khadija
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
