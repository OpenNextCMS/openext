import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { resolveActiveHeader } from '@/lib/menu-redirect/header-detection';

/** GET /api/menu-redirect/menu-items?headerId= — the active header's menu items. */
export async function GET(req: NextRequest) {
  try {
    await guardMenuRedirect('read');
    const { searchParams } = new URL(req.url);
    const headerId = searchParams.get('headerId') || undefined;

    const res = await resolveActiveHeader({ headerId });
    if ('headerId' in res) return apiOk(res);
    return apiOk({ headerId: null, headerName: null, menuItems: [], reason: res.reason });
  } catch (err) {
    return handleApiError(err);
  }
}
