import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { AnalyticsService } from '@/lib/form-builder/services/analyticsService';

/** GET /api/forms/[id]/analytics — AnalyticsSummary (forms.analytics.view). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await guardFormBuilder('forms.analytics.view');
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const summary = await AnalyticsService.getAnalytics(tenantId, id, {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    return apiOk(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
