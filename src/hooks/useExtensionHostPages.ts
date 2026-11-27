'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/apiClient';
import { extensionHostPagesFromList, type ExtensionHostPage } from '@/lib/extensions/hostPages';

/** Enabled extension pages for sidebar links and the plugin runtime frame. */
export function useExtensionHostPages() {
  const [pages, setPages] = useState<ExtensionHostPage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(apiUrl('/api/dashboard/extensions'), { credentials: 'include' });
        const payload = (await response.json()) as { extensions?: unknown };
        if (!response.ok) throw new Error('Extension list failed');
        if (!cancelled) setPages(extensionHostPagesFromList(payload.extensions));
      } catch {
        if (!cancelled) setPages([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loaded };
}
