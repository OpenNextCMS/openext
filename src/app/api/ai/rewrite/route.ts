import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { callAI } from '@/lib/ai/provider';
import { rewriteSchema } from '@/lib/validation/ai';

/** POST /api/ai/rewrite — rewrite text per an instruction. */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { text, instruction } = rewriteSchema.parse(await req.json());
    const result = await callAI([
      {
        role: 'system',
        content:
          'You are an expert editor. Rewrite the user text following their instruction. Return ONLY the rewritten text, no preamble, no quotes, no markdown fences.',
      },
      { role: 'user', content: `Instruction: ${instruction}\n\nText:\n${text}` },
    ]);
    return apiOk({ text: result.trim() });
  } catch (err) {
    return handleApiError(err);
  }
}
