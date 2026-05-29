'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires a "view" on mount and a "read" (with durationSec) when the page is
 * hidden or unmounted. Uses sendBeacon when available so the read event
 * survives navigation. Drop this into the public post page.
 */
export default function AnalyticsBeacon({ blogId }: { blogId: string }) {
  const start = useRef(Date.now());
  const sentRead = useRef(false);

  useEffect(() => {
    // View event.
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'view', blogId }),
    }).catch(() => {});

    const sendRead = () => {
      if (sentRead.current) return;
      sentRead.current = true;
      const durationSec = Math.round((Date.now() - start.current) / 1000);
      const payload = JSON.stringify({ type: 'read', blogId, durationSec });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sendRead();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', sendRead);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', sendRead);
      sendRead();
    };
  }, [blogId]);

  return null;
}
