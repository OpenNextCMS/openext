/**
 * Fire-and-forget click beacon for a tracked menu mapping. Uses sendBeacon so
 * the event survives the navigation that follows. Used by the runtime navbar
 * merge (Phase 12) for links with trackClicks enabled.
 */
export function trackMenuClick(mappingId: string): void {
  if (!mappingId) return;
  try {
    const payload = JSON.stringify({ mappingId });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/menu-redirect/track', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/menu-redirect/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never block navigation on analytics */
  }
}
