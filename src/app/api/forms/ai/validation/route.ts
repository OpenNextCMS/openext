import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { generateValidationRules } from '@/lib/form-builder/ai';
import { aiValidationSchema } from '@/lib/form-builder/schemas';

/** POST /api/forms/ai/validation — NL → validation rules (forms.edit). */
export async function POST(req: NextRequest) {
  try {
    await guardFormBuilder('forms.edit');
    const { prompt, fieldType } = aiValidationSchema.parse(await req.json());
    const rules = await generateValidationRules(prompt, fieldType);
    return apiOk({ rules });
  } catch (err) {
    return handleApiError(err);
  }
}
