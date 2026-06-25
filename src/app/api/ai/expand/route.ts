import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { callAI } from '@/lib/ai/provider';
import { textOnlySchema } from '@/lib/validation/ai';

/** POST /api/ai/expand — produce a longer, more detailed version of the text. */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { text } = textOnlySchema.parse(await req.json());
    const result = await callAI([
      {
        role: 'system',
        content:
          'You expand text into a longer, richer version while preserving meaning and tone. Return ONLY the expanded text — no preamble or markdown fences.',
      },
      { role: 'user', content: text },
    ]);
    return apiOk({ text: result.trim() });
  } catch (err) {
    return handleApiError(err);
  }
}
