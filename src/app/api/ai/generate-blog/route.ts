import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { callAI, safeParseJson } from '@/lib/ai/provider';
import { generateBlogSchema } from '@/lib/validation/ai';
import { BLOCK_TYPES } from '@/components/blog/blocks/types';
import type { ContentBlock, BlogBlockType } from '@/types/index';

const lengthGuide: Record<string, string> = {
  short: '4-6 blocks',
  medium: '8-12 blocks',
  long: '14-20 blocks',
};

interface RawBlock {
  type?: string;
  data?: Record<string, unknown>;
}
interface RawBlog {
  title?: string;
  excerpt?: string;
  contentBlocks?: RawBlock[];
}

/**
 * POST /api/ai/generate-blog — generate a full draft (title, excerpt, blocks).
 * The model is asked for JSON only; output is parsed defensively and every
 * block is normalized to a valid ContentBlock before returning.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { topic, tone, length } = generateBlogSchema.parse(await req.json());

    const raw = await callAI(
      [
        {
          role: 'system',
          content: `You are a blog writer that outputs ONLY JSON (no markdown fences). Shape:
{"title": string, "excerpt": string, "contentBlocks": [{"type": string, "data": object}]}
Allowed block types: ${BLOCK_TYPES.join(', ')}.
Block data shapes:
- heading: {"text": string, "level": "h2"|"h3"}
- paragraph: {"text": "<p>html</p>"}
- quote: {"text": string, "cite": string}
- image: {"url": "", "alt": string}
- code: {"code": string, "language": string}
- faq: {"items": [{"q": string, "a": string}]}
Use mostly heading + paragraph blocks. Target ${lengthGuide[length]}.`,
        },
        {
          role: 'user',
          content: `Write a ${tone} blog post about: ${topic}`,
        },
      ],
      { temperature: 0.8, maxTokens: 4000 }
    );

    const parsed = safeParseJson<RawBlog>(raw);
    if (!parsed || !Array.isArray(parsed.contentBlocks)) {
      return apiError('AI returned an unexpected format. Please try again.', 502);
    }

    const allowed = new Set<string>(BLOCK_TYPES);
    const contentBlocks: ContentBlock[] = parsed.contentBlocks
      .filter((b) => b && typeof b.type === 'string' && allowed.has(b.type))
      .map((b) => ({
        id: uuidv4(),
        type: b.type as BlogBlockType,
        data: (b.data && typeof b.data === 'object' ? b.data : {}) as Record<string, unknown>,
      }));

    return apiOk({
      title: typeof parsed.title === 'string' ? parsed.title : topic,
      excerpt: typeof parsed.excerpt === 'string' ? parsed.excerpt : '',
      contentBlocks,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
