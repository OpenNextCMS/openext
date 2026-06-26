import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { getPageDbConnection, getFormModel } from '@/utils/db';
import { requireFormBuilderActive } from '@/lib/form-builder/lifecycle';
import type { IForm } from '@/types/form-builder';
import { FormStatus } from '@/types/form-builder';

/**
 * GET /api/forms/render/[idOrSlug] — PUBLIC read of a *published* form for the
 * runtime renderer / page-builder block. No auth; plugin must be active. Only
 * the fields needed to render are returned.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    await requireFormBuilderActive();
    const { idOrSlug } = await params;

    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);

    const or: Record<string, unknown>[] = [{ slug: idOrSlug }];
    if (Types.ObjectId.isValid(idOrSlug)) or.push({ _id: idOrSlug });

    const doc = await Form.findOne({ $or: or })
      .select('name slug description status fields settings tenantId')
      .lean()
      .exec();
    if (!doc) return apiError('Form not found', 404);

    const form = doc as unknown as IForm;
    if (form.status !== FormStatus.Published) {
      return apiError('This form is not available', 404);
    }

    return apiOk(form);
  } catch (err) {
    return handleApiError(err);
  }
}
