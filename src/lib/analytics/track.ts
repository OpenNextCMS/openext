/** Fire-and-forget search-query analytics event (used by the public listing). */
export function trackSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'search', query: q }),
  }).catch(() => {});
}
