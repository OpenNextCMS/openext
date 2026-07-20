import { NextRequest } from 'next/server';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { getPageDbConnection, getFormModel } from '@/utils/db';
import { requireFormBuilderActive } from '@/lib/form-builder/lifecycle';
import { AnalyticsService } from '@/lib/form-builder/services/analyticsService';
import { trackEventSchema } from '@/lib/form-builder/schemas';
import type { IForm } from '@/types/form-builder';

/**
 * POST /api/forms/[id]/track — PUBLIC view/start analytics beacon (no auth).
 * Tenancy resolved from the form's own tenantId. Best-effort; never errors hard.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireFormBuilderActive();
    const { id } = await params;
    const { event, sourcePage } = trackEventSchema.parse(await req.json().catch(() => ({})));

    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const formDoc = await Form.findOne({ _id: id }).select('tenantId').lean().exec();
    if (!formDoc) return apiError('Form not found', 404);
    const tenantId = (formDoc as unknown as IForm).tenantId || '';
    if (!tenantId) return apiOk({ ok: true });

    if (event === 'view') await AnalyticsService.trackView(tenantId, id, sourcePage);
    else if (event === 'start') await AnalyticsService.trackStart(tenantId, id);

    return apiOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
