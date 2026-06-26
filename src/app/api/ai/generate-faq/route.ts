import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { callAI, safeParseJson } from '@/lib/ai/provider';
import { generateFaqSchema } from '@/lib/validation/ai';

/** POST /api/ai/generate-faq — derive FAQ items from a topic or post text. */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { text, count = 5 } = generateFaqSchema.parse(await req.json());
    const raw = await callAI(
      [
        {
          role: 'system',
          content: `Generate ${count} frequently-asked questions with concise answers based on the input. Return ONLY a JSON array of objects: [{"q":"...","a":"..."}]. No markdown, no prose.`,
        },
        { role: 'user', content: text.slice(0, 8000) },
      ],
      { temperature: 0.5, maxTokens: 1200 }
    );

    const parsed = safeParseJson<{ q: string; a: string }[] | { items?: { q: string; a: string }[] }>(
      raw
    );
    const items = Array.isArray(parsed) ? parsed : parsed?.items;
    if (!Array.isArray(items)) {
      return apiError('AI returned an unexpected format. Please try again.', 502);
    }
    const clean = items
      .filter((it) => it && typeof it.q === 'string' && typeof it.a === 'string')
      .map((it) => ({ q: it.q.trim(), a: it.a.trim() }));
    return apiOk({ items: clean });
  } catch (err) {
    return handleApiError(err);
  }
}
