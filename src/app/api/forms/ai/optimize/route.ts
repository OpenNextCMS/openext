import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { FormService } from '@/lib/form-builder/services/formService';
import { analyzeForm } from '@/lib/form-builder/ai';
import { aiOptimizeSchema } from '@/lib/form-builder/schemas';

/** POST /api/forms/ai/optimize — optimization suggestions for a form (forms.view). */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await guardFormBuilder('forms.view');
    const { formId } = aiOptimizeSchema.parse(await req.json());
    const form = await FormService.getFormById(tenantId, formId);
    const suggestions = await analyzeForm(form);
    return apiOk({ suggestions });
  } catch (err) {
    return handleApiError(err);
  }
}
