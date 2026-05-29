import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import type { ContentItem } from '@/types/menu-redirect';

/**
 * GET /api/menu-redirect/cms-collections — CMS items for the left panel.
 * This repo has no generic CMS collections yet, so this returns an empty list
 * (the UI handles an empty CMS tab gracefully). Wire real collections here when
 * a CMS module lands.
 */
export async function GET() {
  try {
    await guardMenuRedirect('read');
    const items: ContentItem[] = [];
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}
