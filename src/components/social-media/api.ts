'use client';

import { apiUrl } from '@/lib/apiClient';
import type {
  ISocialMediaPost,
  ISocialMediaSettings,
  SocialPluginState,
  SocialShareUrlItem,
} from '@/types/social-media';

interface Envelope<T> {
  data: T | null;
  error: { message?: string } | null;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(url), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export const socialMediaApi = {
  status: () => req<SocialPluginState>('/api/social-media/status'),
  getSettings: () => req<ISocialMediaSettings>('/api/social-media/settings'),
  saveSettings: (body: Partial<ISocialMediaSettings>) =>
    req<ISocialMediaSettings>('/api/social-media/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  listPosts: () => req<ISocialMediaPost[]>('/api/social-media/posts'),
  createPost: (body: Partial<ISocialMediaPost>) =>
    req<ISocialMediaPost>('/api/social-media/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePost: (id: string, body: Partial<ISocialMediaPost>) =>
    req<ISocialMediaPost>(`/api/social-media/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePost: (id: string) =>
    req<{ deleted: boolean }>(`/api/social-media/posts/${id}`, { method: 'DELETE' }),
  shareUrls: (params: { url: string; title?: string; message?: string }) => {
    const q = new URLSearchParams({ url: params.url });
    if (params.title) q.set('title', params.title);
    if (params.message) q.set('message', params.message);
    return req<{ items: SocialShareUrlItem[] }>(`/api/social-media/share-urls?${q.toString()}`);
  },
};
