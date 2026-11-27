import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/response';
import { requireRbac, assertResourceOwnership, hasCapability } from '@/lib/rbac';

const ALLOWED_UPDATE_FIELDS = [
  'pageName',
  'pageType',
  'isPublished',
  'isHome',
  'isGlobal',
  'preHeading',
  'description',
  'seoName',
  'seoMeta',
  'locale',
  'translationGroupId',
  'themeTemplate',
] as const;

type AllowedUpdateField = (typeof ALLOWED_UPDATE_FIELDS)[number];

function pickAllowedUpdates(source: Record<string, unknown>): Partial<Record<AllowedUpdateField, unknown>> {
  const next: Partial<Record<AllowedUpdateField, unknown>> = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      next[key] = source[key];
    }
  }
  return next;
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireRbac();
    const data = await req.json();
    const { pageID, updatedComponents, slug, ...rawFields } = data;
    const userId = ctx.user.userId;

    if (!pageID && !slug) {
      return NextResponse.json({ message: 'Missing pageID or slug' }, { status: 400 });
    }

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const pageQuery = pageID ? { _id: pageID } : { slug };
    const page = await PageModel.findOne(pageQuery);

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    assertResourceOwnership({
      role: ctx.role,
      ownerId: page.createdBy,
      userId,
      editAllCap: 'pages.edit.all',
      editOwnCap: 'pages.edit.own',
    });

    const scopeUserId = hasCapability(ctx.role, 'pages.edit.all')
      ? String(page.createdBy ?? userId)
      : userId;

    const updateFields = pickAllowedUpdates(
      rawFields && typeof rawFields === 'object' ? (rawFields as Record<string, unknown>) : {}
    );

    // Only overwrite slug when the client actually sent a non-empty string.
    // Unpublish from the page list sends { pageID, isPublished } with no slug —
    // assigning undefined here previously wiped the slug and failed the unique index.
    if (typeof slug === 'string' && slug.trim()) {
      page.slug = slug.trim();
    }

    if (updateFields.isHome) {
      await PageModel.updateMany(
        {
          isHome: true,
          createdBy: scopeUserId,
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
          createdBy: scopeUserId,
          _id: { $ne: page._id },
        },
        { $set: { isGlobal: false } }
      );
    }

    Object.assign(page, updateFields);

    if (updatedComponents !== undefined) {
      page.component = updatedComponents;
    }

    page.modifications.push({
      modifiedBy: new Types.ObjectId(userId),
      modifiedAt: new Date(),
    });

    await page.save();

    try {
      revalidatePath('/');
      if (page.slug) {
        revalidatePath(`/${page.slug}`);
        revalidatePath(`/${page.slug}`, 'page');
      }
      // Header/footer chrome is embedded on every public page — bust the site root layout tree.
      if (page.pageType === 'header' || page.pageType === 'footer') {
        revalidatePath('/', 'layout');
      }
    } catch (revalErr) {
      console.warn('Failed to revalidate path:', revalErr);
    }

    return NextResponse.json({ message: 'Page updated successfully', page }, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}
