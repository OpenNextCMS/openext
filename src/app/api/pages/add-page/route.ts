// app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { DEFAULT_SITE_LOCALE, normalizeLocale } from '@/lib/i18n/siteLanguages';

interface CustomError extends Error {
  statusCode?: number;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireCapability('pages.create');
    const body = await req.json();
    const userId = ctx.user.userId;

    if (body.pageType === 'blog') {
      return NextResponse.json(
        { success: false, message: 'Blog posts must be created via /api/blogs' },
        { status: 400 }
      );
    }
    // 1. Get DB connection
    const pageDb = await getPageDbConnection();

    // 2. Get the Page model tied to this DB
    const PageModel = getPageModel(pageDb);

    const locale = normalizeLocale(body.locale, DEFAULT_SITE_LOCALE);
    const translationGroupId =
      typeof body.translationGroupId === 'string' && body.translationGroupId
        ? body.translationGroupId
        : randomUUID();

    // 3. Create a new Page. The slug has a unique index per locale, so if it
    //    already exists we append a numeric suffix (slug-2, slug-3, ...) and retry.
    const baseSlug = typeof body.slug === 'string' ? body.slug : '';
    const MAX_ATTEMPTS = 50;
    let newPage: InstanceType<typeof PageModel> | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const page = new PageModel({
        ...body,
        slug: candidateSlug,
        locale,
        translationGroupId,
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
    if (err.statusCode) {
      return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode });
    }
    return handleApiError(error);
  }
}
