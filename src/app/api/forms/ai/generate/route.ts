import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { generateFormSchema } from '@/lib/form-builder/ai';
import { aiGenerateSchema } from '@/lib/form-builder/schemas';

/** POST /api/forms/ai/generate — AI-generate a field schema (forms.create). */
export async function POST(req: NextRequest) {
  try {
    await guardFormBuilder('forms.create');
    const { prompt } = aiGenerateSchema.parse(await req.json());
    const fields = await generateFormSchema(prompt);
    return apiOk({ fields });
  } catch (err) {
    return handleApiError(err);
  }
}
