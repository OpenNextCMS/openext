import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { FormService } from '@/lib/form-builder/services/formService';
import { logFormAudit } from '@/lib/form-builder/audit';
import { updateFormSchema } from '@/lib/form-builder/schemas';
import { FormStatus } from '@/types/form-builder';

/** GET /api/forms/[id] — full form document (permission: forms.view). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await guardFormBuilder('forms.view');
    const { id } = await params;
    const form = await FormService.getFormById(tenantId, id);
    return apiOk(form);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/forms/[id] — update (permission: forms.edit; publish needs
 * forms.publish). Auto-snapshots a version before saving and invalidates the
 * public form cache.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Base permission to edit.
    const { tenantId, userId } = await guardFormBuilder('forms.edit');
    const { id } = await params;
    const body = updateFormSchema.parse(await req.json());

    // Publishing is a higher-tier action.
    if (body.status === FormStatus.Published) {
      await guardFormBuilder('forms.publish');
    }

    const previous = await FormService.getFormById(tenantId, id);
    const updated = await FormService.updateForm(tenantId, id, body, userId);

    const action =
      body.status === FormStatus.Published
        ? 'form.published'
        : body.status === FormStatus.Archived
          ? 'form.archived'
          : 'form.updated';
    await logFormAudit({ action, entityId: id, userId, metadata: { name: updated.name } });

    // Invalidate the public form route cache (current + previous slug).
    try {
      revalidatePath(`/forms/${updated.slug}`);
      if (previous.slug && previous.slug !== updated.slug) {
        revalidatePath(`/forms/${previous.slug}`);
      }
    } catch (e) {
      console.warn('revalidate failed', e);
    }

    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/forms/[id] — delete form + its submissions (permission: forms.delete). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await guardFormBuilder('forms.delete');
    const { id } = await params;

    const existing = await FormService.getFormById(tenantId, id);
    await FormService.deleteForm(tenantId, id);
    await logFormAudit({
      action: 'form.deleted',
      entityId: id,
      userId,
      metadata: { name: existing.name },
    });

    try {
      revalidatePath(`/forms/${existing.slug}`);
    } catch (e) {
      console.warn('revalidate failed', e);
    }

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
