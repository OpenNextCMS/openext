'use client';

import { useEffect } from 'react';

const BRIDGE_SOURCE = 'theme-engine-edit-bridge';

/**
 * Runs inside the exact editor iframe. Posts section metadata to the parent
 * and highlights the selected section without changing layout (outline only).
 */
export default function ThemeEditBridge({
  themeSlug,
  pageSlug,
  sections,
}: {
  themeSlug: string;
  pageSlug: string;
  sections: Array<{ id: string; label: string; blockType: string; hidden?: boolean }>;
}) {
  useEffect(() => {
    const post = (type: string, payload: Record<string, unknown> = {}) => {
      window.parent?.postMessage(
        { source: BRIDGE_SOURCE, type, themeSlug, pageSlug, ...payload },
        window.location.origin
      );
    };

    post('ready', { sections });

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'theme-engine-edit-host') return;

      if (data.type === 'select-section') {
        const id = String(data.sectionId || '');
        document.querySelectorAll('[data-theme-section-selected="true"]').forEach((el) => {
          el.removeAttribute('data-theme-section-selected');
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.outlineOffset = '';
        });
        if (!id) return;
        const target = document.querySelector(`[data-theme-section-id="${CSS.escape(id)}"]`);
        if (target instanceof HTMLElement) {
          target.setAttribute('data-theme-section-selected', 'true');
          target.style.outline = '2px solid #38bdf8';
          target.style.outlineOffset = '4px';
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.('[data-theme-section-id]');
      if (!el) return;
      const sectionId = el.getAttribute('data-theme-section-id');
      if (!sectionId) return;
      event.preventDefault();
      event.stopPropagation();
      post('section-selected', { sectionId });
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('click', onClick, true);
    };
  }, [themeSlug, pageSlug, sections]);

  return null;
}

export { BRIDGE_SOURCE };
