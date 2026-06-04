// app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

interface CustomError extends Error {
  statusCode?: number;
}
interface DecodedToken {
  userId: string;
  email: string;
}
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (body.pageType === 'blog') {
      return NextResponse.json(
        { success: false, message: 'Blog posts must be created via /api/blogs' },
        { status: 400 }
      );
    }

    const decodedToken = jwtDecode<DecodedToken>(token);
    const userId = decodedToken.userId;
    // 1. Get DB connection
    const pageDb = await getPageDbConnection();

    // 2. Get the Page model tied to this DB
    const PageModel = getPageModel(pageDb);

    // 3. Create a new Page. The slug has a unique index, so if it already
    //    exists we append a numeric suffix (slug-2, slug-3, ...) and retry.
    //    The retry loop also covers races where two requests pick the same slug.
    const baseSlug = typeof body.slug === 'string' ? body.slug : '';
    const MAX_ATTEMPTS = 50;
    let newPage: InstanceType<typeof PageModel> | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const page = new PageModel({
        ...body,
        slug: candidateSlug,
        createdBy: userId,
        modifications: [
          {
            modifiedBy: userId,
            modifiedAt: new Date(),
          },
        ],
      });

      try {
        await page.save();
        newPage = page;
        break;
      } catch (error) {
        const err = error as { code?: number; keyPattern?: Record<string, unknown> };
        // Only retry on a duplicate-key error caused by the slug index.
        if (err.code === 11000 && err.keyPattern && 'slug' in err.keyPattern) {
          continue;
        }
        throw error;
      }
    }

    if (!newPage) {
      return NextResponse.json(
        {
          success: false,
          message: `Could not generate a unique slug for "${baseSlug}" after ${MAX_ATTEMPTS} attempts.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: newPage, userId }, { status: 201 });
  } catch (error) {
    const err = error as CustomError;
    console.error('Error creating page:', err.message);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
