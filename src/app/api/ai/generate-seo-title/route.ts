import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { callAI } from '@/lib/ai/provider';
import { seoTitleSchema } from '@/lib/validation/ai';

/** POST /api/ai/generate-seo-title — SEO title (<=60 chars). */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { title, keyword } = seoTitleSchema.parse(await req.json());
    const result = await callAI(
      [
        {
          role: 'system',
          content:
            'Write an SEO-optimized title of at most 60 characters. Return ONLY the title, no quotes.',
        },
        {
          role: 'user',
          content: `Current title: ${title}${keyword ? `\nFocus keyword: ${keyword}` : ''}`,
        },
      ],
      { maxTokens: 60, temperature: 0.6 }
    );
    return apiOk({ title: result.trim().replace(/^["']|["']$/g, '').slice(0, 65) });
  } catch (err) {
    return handleApiError(err);
  }
}
