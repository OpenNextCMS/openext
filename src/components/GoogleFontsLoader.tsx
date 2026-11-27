'use client';

import { useEffect } from 'react';
import { getEditorGoogleFontsHref } from '@/lib/editor/fontFamilies';

const LINK_ID = 'opennext-editor-google-fonts';

/**
 * Injects the curated Google Fonts stylesheet once so Typography font
 * choices render correctly in the editor and on published pages.
 */
export default function GoogleFontsLoader() {
  useEffect(() => {
    const href = getEditorGoogleFontsHref();
    if (!href || typeof document === 'undefined') return;

    if (!document.getElementById(LINK_ID)) {
      const link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    // Preconnect hints improve first paint of webfonts
    const ensurePreconnect = (id: string, hrefValue: string, crossOrigin?: boolean) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'preconnect';
      link.href = hrefValue;
      if (crossOrigin) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    };
    ensurePreconnect('opennext-fonts-preconnect-googleapis', 'https://fonts.googleapis.com');
    ensurePreconnect('opennext-fonts-preconnect-gstatic', 'https://fonts.gstatic.com', true);
  }, []);

  return null;
}
