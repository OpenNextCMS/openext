import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { FormService } from '@/lib/form-builder/services/formService';
import { logFormAudit } from '@/lib/form-builder/audit';

/** POST /api/forms/[id]/duplicate — clone a form as a new draft (forms.create). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await guardFormBuilder('forms.create');
    const { id } = await params;
    const copy = await FormService.duplicateForm(tenantId, id, userId);
    await logFormAudit({
      action: 'form.created',
      entityId: String(copy._id),
      userId,
      metadata: { duplicatedFrom: id },
    });
    return apiOk(copy, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
