'use client';

import type {
  IForm,
  ISubmission,
  IFormVersion,
  IFormField,
  AnalyticsSummary,
  ValidationRule,
  FormOptimizationSuggestion,
} from '@/types/form-builder';

/**
 * Thin client wrappers over the /api/forms endpoints. Each returns the `data`
 * payload from the standard { data, error } envelope and throws on error.
 */

interface Envelope<T> {
  data: T | null;
  error: { message?: string } | null;
  meta?: { total?: number; page?: number; limit?: number; hasMore?: boolean };
}

async function req<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: Envelope<T>['meta'] }> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return { data: json.data as T, meta: json.meta };
}

export const formApi = {
  async list(params: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
    return req<IForm[]>(`/api/forms?${qs.toString()}`);
  },
  get: (id: string) => req<IForm>(`/api/forms/${id}`).then((r) => r.data),
  create: (body: Partial<IForm>) =>
    req<IForm>('/api/forms', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data),
  update: (id: string, body: Partial<IForm>) =>
    req<IForm>(`/api/forms/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  remove: (id: string) => req<{ id: string }>(`/api/forms/${id}`, { method: 'DELETE' }).then((r) => r.data),
  duplicate: (id: string) =>
    req<IForm>(`/api/forms/${id}/duplicate`, { method: 'POST' }).then((r) => r.data),
  submissions: (id: string, params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
    return req<ISubmission[]>(`/api/forms/${id}/submissions?${qs.toString()}`);
  },
  analytics: (id: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
    return req<AnalyticsSummary>(`/api/forms/${id}/analytics?${qs.toString()}`).then((r) => r.data);
  },
  versions: (id: string) => req<IFormVersion[]>(`/api/forms/${id}/versions`).then((r) => r.data),
  restoreVersion: (id: string, versionId: string) =>
    req<IForm>(`/api/forms/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ versionId }),
    }).then((r) => r.data),
  status: () =>
    req<{ installed: boolean; enabled: boolean; role: string }>(`/api/forms/status`).then((r) => r.data),
  aiGenerate: (prompt: string) =>
    req<{ fields: IFormField[] }>('/api/forms/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }).then((r) => r.data.fields),
  aiValidation: (prompt: string, fieldType: string) =>
    req<{ rules: ValidationRule[] }>('/api/forms/ai/validation', {
      method: 'POST',
      body: JSON.stringify({ prompt, fieldType }),
    }).then((r) => r.data.rules),
  aiOptimize: (formId: string) =>
    req<{ suggestions: FormOptimizationSuggestion[] }>('/api/forms/ai/optimize', {
      method: 'POST',
      body: JSON.stringify({ formId }),
    }).then((r) => r.data.suggestions),
};
