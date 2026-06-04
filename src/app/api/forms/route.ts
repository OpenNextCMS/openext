import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { FormService } from '@/lib/form-builder/services/formService';
import { logFormAudit } from '@/lib/form-builder/audit';
import { createFormSchema } from '@/lib/form-builder/schemas';
import type { FormStatusValue } from '@/types/form-builder';

/** GET /api/forms — paginated list (permission: forms.view). */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await guardFormBuilder('forms.view');
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams);

    const { forms, total } = await FormService.getForms(
      tenantId,
      {
        status: (searchParams.get('status') as FormStatusValue) || undefined,
        search: searchParams.get('search') || undefined,
        sortBy: searchParams.get('sortBy') || undefined,
      },
      { page, limit }
    );

    return apiOk(forms, {
      meta: { total, page, limit, hasMore: page * limit < total },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/forms — create a form (permission: forms.create). */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await guardFormBuilder('forms.create');
    const body = createFormSchema.parse(await req.json());

    const form = await FormService.createForm(tenantId, body, userId);
    await logFormAudit({
      action: 'form.created',
      entityId: String(form._id),
      userId,
      metadata: { name: form.name },
    });

    return apiOk(form, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
