import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPageDbConnection, getBlogPostModel } from '@/utils/db';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';

/**
 * Publishes scheduled posts whose scheduledAt has passed.
 *
 * Trigger from Vercel Cron by adding to vercel.json:
 *   { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "* /5 * * * *" }] }
 * Optionally set CRON_SECRET and pass it as ?secret= or `Authorization: Bearer <secret>`.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get('secret') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (provided !== secret) return apiError('Unauthorized', 401);
  }

  const pageDb = await getPageDbConnection();
  const BlogPost = getBlogPostModel(pageDb);
  const now = new Date();

  const due = await BlogPost.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  })
    .select('slug')
    .lean()
    .exec();

  const result = await BlogPost.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'published', isPublished: true, publishedAt: now } }
  );

  try {
    revalidatePath('/blog');
    for (const p of due) {
      const slug = (p as { slug?: string }).slug;
      if (slug) revalidatePath(`/blog/${slug}`);
    }
  } catch (e) {
    console.warn('revalidate failed', e);
  }

  return apiOk({ published: result.modifiedCount ?? 0 });
}

export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await run(req);
  } catch (err) {
    return handleApiError(err);
  }
}
