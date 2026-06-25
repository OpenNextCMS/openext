import DOMPurify from 'isomorphic-dompurify';

/**
 * Isomorphic HTML sanitizer (works in both Node SSR and the browser).
 * Used for any block whose data contains raw/rich HTML — currently
 * `paragraph` (rich text) and `custom-html`.
 */
export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}
