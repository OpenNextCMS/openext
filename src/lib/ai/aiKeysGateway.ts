import { Schema } from 'mongoose';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
} from '@/lib/security/credentialEncryption';
import { AI_API_KEYS_PLUGIN_ID, CMS_CORE_AI_CONSUMER_ID } from '@/lib/ai/constants';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | string;
  content: string;
};

type AiProviderDoc = {
  providerId?: string;
  label?: string;
  baseUrl?: string;
  defaultModel?: string;
  apiStyle?: 'openai' | 'anthropic' | string;
  enabled?: boolean;
};

type AiApiKeyDoc = {
  _id?: unknown;
  providerId?: string;
  label?: string;
  apiKeyEnc?: string;
  priority?: number;
  enabled?: boolean;
  status?: 'healthy' | 'cooldown' | 'disabled' | string;
  cooldownUntil?: Date;
  lastError?: string;
  lastUsedAt?: Date;
  successCount?: number;
  failCount?: number;
  save?: () => Promise<unknown>;
};

type AiBindingDoc = {
  consumerPluginId?: string;
  bindingKey?: string;
  providerId?: string;
  model?: string;
  enabled?: boolean;
};

export type AiKeysChatResult = {
  content: string;
  model: string;
  providerId: string;
};

const AiProviderSchema = new Schema(
  {
    providerId: { type: String, required: true, trim: true, unique: true, index: true },
    label: { type: String, required: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    defaultModel: { type: String, default: '', trim: true },
    apiStyle: {
      type: String,
      enum: ['openai', 'anthropic'],
      default: 'openai',
    },
    keyHint: { type: String, default: '', trim: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AiApiKeySchema = new Schema(
  {
    providerId: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: '', trim: true },
    apiKeyEnc: { type: String, default: '', select: false },
    priority: { type: Number, default: 100 },
    enabled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['healthy', 'cooldown', 'disabled'],
      default: 'healthy',
    },
    cooldownUntil: { type: Date },
    lastError: { type: String, default: '' },
    lastUsedAt: { type: Date },
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    createdBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const AiBindingSchema = new Schema(
  {
    consumerPluginId: { type: String, required: true, trim: true, index: true },
    bindingKey: { type: String, default: 'default', trim: true },
    providerId: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const DEFAULT_COOLDOWN_MS = 60 * 1000;
const MAX_COOLDOWN_MS = 15 * 60 * 1000;

async function getModel(suffix: string, schema: Schema) {
  const conn = await getUserDbConnection();
  const modelName = `${AI_API_KEYS_PLUGIN_ID}_${suffix}`;
  return conn.models[modelName] || conn.model(modelName, schema);
}

function normalizeBaseUrl(baseUrl: string): string {
  return String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
}

function splitAnthropicMessages(messages: ChatMessage[]) {
  const systemParts: string[] = [];
  const converted: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of messages) {
    const role = String(msg?.role || '').trim();
    const content = typeof msg?.content === 'string' ? msg.content : String(msg?.content ?? '');
    if (role === 'system') {
      if (content) systemParts.push(content);
      continue;
    }
    converted.push({
      role: role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }
  return {
    system: systemParts.join('\n\n').trim(),
    messages: converted.length ? converted : [{ role: 'user' as const, content: 'Hello' }],
  };
}

function extractContent(apiStyle: string, json: Record<string, unknown> | null): string {
  if (!json) return '';
  if (apiStyle === 'anthropic') {
    const blocks = Array.isArray(json.content) ? json.content : [];
    return blocks
      .map((b) =>
        b && typeof b === 'object' && (b as { type?: string }).type === 'text'
          ? String((b as { text?: string }).text || '')
          : ''
      )
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  const choices = json.choices as
    | { message?: { content?: string }; text?: string }[]
    | undefined;
  return String(choices?.[0]?.message?.content ?? choices?.[0]?.text ?? '');
}

async function callUpstream(params: {
  apiStyle: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ ok: boolean; status: number; content: string; message: string }> {
  const style = params.apiStyle === 'anthropic' ? 'anthropic' : 'openai';
  const maxTokens = params.maxTokens ?? 1500;
  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  if (style === 'anthropic') {
    const split = splitAnthropicMessages(params.messages);
    url = `${normalizeBaseUrl(params.baseUrl)}/messages`;
    headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    };
    body = {
      model: params.model,
      max_tokens: maxTokens,
      messages: split.messages,
    };
    if (split.system) body.system = split.system;
    if (typeof params.temperature === 'number') body.temperature = params.temperature;
  } else {
    url = `${normalizeBaseUrl(params.baseUrl)}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    };
    body = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: maxTokens,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text().catch(() => '');
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  const errObj = json?.error as { message?: string } | undefined;
  const message =
    errObj?.message ||
    (typeof json?.message === 'string' ? json.message : '') ||
    text.slice(0, 200) ||
    `HTTP ${response.status}`;

  return {
    ok: response.ok,
    status: response.status,
    content: extractContent(style, json),
    message,
  };
}

function cooldownMs(failCount: number): number {
  return Math.min(DEFAULT_COOLDOWN_MS * Math.max(1, failCount || 1), MAX_COOLDOWN_MS);
}

/**
 * True when the AI API Keys plugin is installed/active.
 */
export async function isAiApiKeysPluginActive(): Promise<boolean> {
  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugin = await PluginModel.findOne({
      pluginId: AI_API_KEYS_PLUGIN_ID,
      isActive: true,
    })
      .select('pluginId isActive')
      .lean()
      .exec();
    return Boolean(plugin);
  } catch {
    return false;
  }
}

async function getBinding(
  consumerPluginId: string,
  bindingKey = 'default'
): Promise<AiBindingDoc | null> {
  const Model = await getModel('AiBinding', AiBindingSchema);
  return (await Model.findOne({
    consumerPluginId: String(consumerPluginId).trim(),
    bindingKey: String(bindingKey || 'default').trim() || 'default',
    enabled: true,
  })
    .lean()
    .exec()) as AiBindingDoc | null;
}

async function getProvider(providerId: string): Promise<AiProviderDoc | null> {
  const Model = await getModel('AiProvider', AiProviderSchema);
  return (await Model.findOne({ providerId: String(providerId).trim(), enabled: true })
    .lean()
    .exec()) as AiProviderDoc | null;
}

async function getUsableKeys(providerId: string): Promise<AiApiKeyDoc[]> {
  const Model = await getModel('AiApiKey', AiApiKeySchema);
  const now = new Date();
  const docs = (await Model.find({
    providerId: String(providerId).trim(),
    enabled: true,
    status: { $ne: 'disabled' },
  })
    .select('+apiKeyEnc')
    .sort({ priority: 1, lastUsedAt: 1, createdAt: 1 })
    .exec()) as AiApiKeyDoc[];

  const usable: AiApiKeyDoc[] = [];
  for (const doc of docs) {
    if (doc.status === 'cooldown' && doc.cooldownUntil && doc.cooldownUntil > now) {
      continue;
    }
    if (doc.status === 'cooldown' && (!doc.cooldownUntil || doc.cooldownUntil <= now)) {
      doc.status = 'healthy';
      doc.cooldownUntil = undefined;
      if (typeof doc.save === 'function') await doc.save();
    }

    const stored = String(doc.apiKeyEnc || '').trim();
    if (!stored) continue;

    try {
      const plain = decryptCredential(stored);
      if (!plain) continue;
      if (!isEncryptedCredential(stored)) {
        doc.apiKeyEnc = encryptCredential(plain);
        if (typeof doc.save === 'function') await doc.save();
      }
      usable.push(doc);
    } catch {
      doc.status = 'disabled';
      doc.lastError = 'Decrypt failed';
      if (typeof doc.save === 'function') await doc.save();
    }
  }
  return usable;
}

async function markSuccess(doc: AiApiKeyDoc) {
  doc.status = 'healthy';
  doc.cooldownUntil = undefined;
  doc.lastError = '';
  doc.lastUsedAt = new Date();
  doc.successCount = (doc.successCount || 0) + 1;
  if (typeof doc.save === 'function') await doc.save();
}

async function markCooldown(doc: AiApiKeyDoc, message: string) {
  doc.failCount = (doc.failCount || 0) + 1;
  doc.status = 'cooldown';
  doc.cooldownUntil = new Date(Date.now() + cooldownMs(doc.failCount));
  doc.lastError = message.slice(0, 300);
  doc.lastUsedAt = new Date();
  if (typeof doc.save === 'function') await doc.save();
}

async function markDisabled(doc: AiApiKeyDoc, message: string) {
  doc.failCount = (doc.failCount || 0) + 1;
  doc.status = 'disabled';
  doc.cooldownUntil = undefined;
  doc.lastError = message.slice(0, 300);
  doc.lastUsedAt = new Date();
  if (typeof doc.save === 'function') await doc.save();
}

/**
 * Resolve whether cms-core (or another consumer) has a usable vault binding.
 */
export async function resolveAiKeysBinding(
  consumerPluginId: string = CMS_CORE_AI_CONSUMER_ID,
  bindingKey = 'default'
): Promise<{
  configured: boolean;
  providerId: string;
  model: string;
  hasKeys: boolean;
}> {
  if (!(await isAiApiKeysPluginActive())) {
    return { configured: false, providerId: '', model: '', hasKeys: false };
  }

  const binding = await getBinding(consumerPluginId, bindingKey);
  if (!binding?.providerId || !binding.model) {
    return { configured: false, providerId: '', model: '', hasKeys: false };
  }

  const provider = await getProvider(binding.providerId);
  if (!provider?.baseUrl) {
    return {
      configured: false,
      providerId: binding.providerId,
      model: binding.model,
      hasKeys: false,
    };
  }

  const keys = await getUsableKeys(binding.providerId);
  return {
    configured: keys.length > 0,
    providerId: binding.providerId,
    model: binding.model,
    hasKeys: keys.length > 0,
  };
}

/**
 * Chat via the AI API Keys vault with key-pool failover.
 * Returns null when the plugin/binding is not configured (caller should fall back).
 */
export async function chatViaAiKeysGateway(
  messages: ChatMessage[],
  opts: {
    consumerPluginId?: string;
    bindingKey?: string;
    modelOverride?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<AiKeysChatResult | null> {
  if (!(await isAiApiKeysPluginActive())) return null;

  const consumerPluginId = opts.consumerPluginId || CMS_CORE_AI_CONSUMER_ID;
  const bindingKey = opts.bindingKey || 'default';
  const binding = await getBinding(consumerPluginId, bindingKey);
  if (!binding?.providerId || !binding.model) return null;

  const provider = await getProvider(binding.providerId);
  if (!provider?.baseUrl) return null;

  const model = String(opts.modelOverride || binding.model || provider.defaultModel || '').trim();
  if (!model) return null;

  const keys = await getUsableKeys(binding.providerId);
  if (!keys.length) return null;

  const errors: string[] = [];

  for (const doc of keys) {
    let apiKey = '';
    try {
      apiKey = decryptCredential(String(doc.apiKeyEnc || ''));
    } catch (error) {
      await markDisabled(doc, error instanceof Error ? error.message : 'Decrypt failed');
      continue;
    }
    if (!apiKey) continue;

    try {
      const result = await callUpstream({
        apiStyle: provider.apiStyle || 'openai',
        baseUrl: provider.baseUrl!,
        apiKey,
        model,
        messages,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });

      if (result.ok) {
        await markSuccess(doc);
        return {
          content: String(result.content || ''),
          model,
          providerId: binding.providerId!,
        };
      }

      if (result.status === 401) {
        await markDisabled(doc, result.message);
      } else {
        await markCooldown(doc, result.message);
      }
      errors.push(result.message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await markCooldown(doc, msg);
      errors.push(msg);
    }
  }

  throw new Error(
    `AI API Keys gateway: all keys failed for ${binding.providerId}. ${errors.join('; ').slice(0, 300)}`
  );
}
