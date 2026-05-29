import { jsonrepair } from 'jsonrepair';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import { ApiError } from '@/lib/api/errors';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AiConfig {
  apiKey: string;
  model: string;
}

/**
 * Resolve the AI provider config the same way the page-generator does:
 * DB settings (`aiConfig.openrouter*`) first, then env vars. This reuses the
 * project's existing OpenRouter setup rather than introducing a new provider.
 */
export async function getAiConfig(): Promise<AiConfig> {
  const env = { ...process.env, ...getDynamicEnv() } as Record<string, string | undefined>;
  let aiConfig: Record<string, unknown> = {};
  try {
    await getUserDbConnection();
    const SettingsModel = getSettingsModel();
    const settings = await SettingsModel.findOne({}).select('aiConfig').lean().exec();
    aiConfig = (settings?.aiConfig || {}) as Record<string, unknown>;
  } catch {
    /* fall back to env */
  }
  const pick = (dbKey: string, envKey: string, fallback = '') => {
    const v = aiConfig[dbKey];
    return typeof v === 'string' && v.trim() ? v.trim() : env[envKey] || fallback;
  };
  return {
    apiKey: pick('openrouterApiKey', 'OPENROUTER_API_KEY'),
    model: pick('openrouterModel', 'OPENROUTER_MODEL', 'google/gemini-2.0-flash-001'),
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Call the chat-completions API and return the assistant's text. */
export async function callAI(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { apiKey, model } = await getAiConfig();
  if (!apiKey) {
    throw new ApiError('AI is not configured — add an OpenRouter API key in AI settings.', 503);
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(`AI request failed (${res.status}): ${text.slice(0, 200)}`, 502);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json?.choices?.[0]?.message?.content ?? '';
}

/** Remove ```json fences / stray backticks the model may wrap output in. */
export function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();
}

/**
 * Parse model output to JSON, never trusting it to be valid:
 * try as-is, then via jsonrepair. Returns null on total failure.
 */
export function safeParseJson<T>(raw: string): T | null {
  const stripped = stripCodeFences(raw);
  try {
    return JSON.parse(stripped) as T;
  } catch {
    /* try repair */
  }
  try {
    return JSON.parse(jsonrepair(stripped)) as T;
  } catch {
    return null;
  }
}
