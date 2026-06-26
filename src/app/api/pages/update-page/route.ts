import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

interface DecodedToken {
  userId: string;
  email: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const data = await req.json();
    const { userId: bodyUserId, pageID, updatedComponents, slug, ...updateFields } = data;
    const decodedToken = token ? jwtDecode<DecodedToken>(token) : null;
    const userId = bodyUserId || decodedToken?.userId;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!pageID && !slug) {
      return NextResponse.json({ message: 'Missing pageID or slug' }, { status: 400 });
    }

    // Get dynamic DB connection
    const pageDb = await getPageDbConnection();

    // Get PageModel using the connection
    const PageModel = getPageModel(pageDb);
    const pageQuery = pageID ? { _id: pageID, createdBy: userId } : { slug, createdBy: userId };
    const page = await PageModel.findOne(pageQuery);

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    if (updateFields.isHome) {
      await PageModel.updateMany(
        {
          isHome: true,
          createdBy: userId,
          _id: { $ne: page._id },
          $or: [{ pageType: 'page' }, { pageType: { $exists: false } }],
        },
        { $set: { isHome: false } }
      );
    }

    if (updateFields.isGlobal && (page.pageType === 'header' || page.pageType === 'footer')) {
      await PageModel.updateMany(
        {
          isGlobal: true,
          pageType: page.pageType,
          createdBy: userId,
          _id: { $ne: page._id },
        },
        { $set: { isGlobal: false } }
      );
    }

    Object.assign(page, { ...updateFields, slug });
    // Update components
    if (updatedComponents !== undefined) {
      page.component = updatedComponents;
    }

    page.modifications.push({
      modifiedBy: userId,
      modifiedAt: new Date(),
    });

    await page.save();

    if (page.slug) {
      try {
        revalidatePath(`/${page.slug}`);
        revalidatePath('/');
      } catch (revalErr) {
        console.warn('Failed to revalidate path:', revalErr);
      }
    }

    return NextResponse.json({ message: 'Page updated successfully', page }, { status: 200 });
  } catch (err) {
    console.error('Mongo Save Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save page';
    return NextResponse.json({ message, error: String(err) }, { status: 500 });
  }
}
