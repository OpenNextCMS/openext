import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { callAI } from '@/lib/ai/provider';
import { metaDescriptionSchema } from '@/lib/validation/ai';

/** POST /api/ai/generate-meta-description — SEO meta description (<=155 chars). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { title, body } = metaDescriptionSchema.parse(await req.json());
    const result = await callAI(
      [
        {
          role: 'system',
          content:
            'Write a compelling SEO meta description of at most 155 characters. Return ONLY the description text, a single line, no quotes.',
        },
        { role: 'user', content: `Title: ${title}\n\nContent:\n${body}`.slice(0, 6000) },
      ],
      { maxTokens: 120, temperature: 0.6 }
    );
    return apiOk({ description: result.trim().replace(/^["']|["']$/g, '').slice(0, 160) });
  } catch (err) {
    return handleApiError(err);
  }
}
