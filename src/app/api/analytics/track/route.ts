import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getPageDbConnection, getAnalyticsEventModel, getPageModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { trackEventSchema } from '@/lib/validation/analytics';

/**
 * POST /api/analytics/track — PUBLIC analytics beacon.
 * Records view/read/search events with a visitorId cookie and increments the
 * post's view counter on a "view".
 */
export async function POST(req: NextRequest) {
  try {
    const body = trackEventSchema.parse(await req.json());

    const cookieStore = await cookies();
    let visitorId = cookieStore.get('visitorId')?.value;
    const isNewVisitor = !visitorId;
    if (!visitorId) visitorId = randomUUID();

    const pageDb = await getPageDbConnection();
    const Analytics = getAnalyticsEventModel(pageDb);

    await Analytics.create({
      type: body.type,
      blogId: body.blogId,
      visitorId,
      durationSec: body.durationSec,
      query: body.query,
    });

    if (body.type === 'view' && body.blogId) {
      const Page = getPageModel(pageDb);
      await Page.updateOne({ _id: body.blogId }, { $inc: { views: 1 } });
    }

    const res = apiOk({ ok: true });
    if (isNewVisitor) {
      res.cookies.set('visitorId', visitorId, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
