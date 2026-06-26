'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Client hook for calling the blog AI endpoints (/api/ai/*).
 * `loading` holds the name of the in-flight endpoint (or null).
 */
export function useAi() {
  const [loading, setLoading] = useState<string | null>(null);

  const run = useCallback(async <T,>(endpoint: string, body: unknown): Promise<T | null> => {
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'AI request failed');
      return json.data as T;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setLoading(null);
    }
  }, []);

  return { loading, run };
}
