import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { FormService } from '@/lib/form-builder/services/formService';
import { logFormAudit } from '@/lib/form-builder/audit';
import { restoreVersionSchema } from '@/lib/form-builder/schemas';

/** GET /api/forms/[id]/versions — version history (forms.view). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await guardFormBuilder('forms.view');
    const { id } = await params;
    const versions = await FormService.getVersions(tenantId, id);
    return apiOk(versions);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/forms/[id]/versions — restore a version snapshot (forms.edit). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await guardFormBuilder('forms.edit');
    const { id } = await params;
    const { versionId } = restoreVersionSchema.parse(await req.json());

    const restored = await FormService.restoreVersion(tenantId, id, versionId);
    await logFormAudit({
      action: 'form.restored',
      entityId: id,
      userId,
      metadata: { versionId },
    });
    return apiOk(restored);
  } catch (err) {
    return handleApiError(err);
  }
}
