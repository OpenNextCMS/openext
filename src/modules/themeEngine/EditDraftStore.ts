/**
 * Short-lived in-memory draft store for exact editor live preview.
 * Keyed by random id; TTL-purged. Process-local (fine for single-node / dev).
 */

export type EditDraftPayload = {
  pageSlug: string;
  themeSlug: string;
  blocks: unknown[];
  createdAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, EditDraftPayload>();

function purge(): void {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.createdAt > TTL_MS) store.delete(key);
  }
}

export const EditDraftStore = {
  put(payload: Omit<EditDraftPayload, 'createdAt'>): string {
    purge();
    const key = `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    store.set(key, { ...payload, createdAt: Date.now() });
    return key;
  },

  get(key: string): EditDraftPayload | null {
    purge();
    const value = store.get(key);
    if (!value) return null;
    if (Date.now() - value.createdAt > TTL_MS) {
      store.delete(key);
      return null;
    }
    return value;
  },

  delete(key: string): void {
    store.delete(key);
  },
};
