'use client';

import { useEffect, useRef } from 'react';

/**
 * Loads theme client scripts in strict order (companions first, then theme.js).
 * Dynamic injection avoids Next.js App Router reordering defer scripts.
 */
export default function ThemeScripts({
  scriptUrl,
  companionScriptUrls = [],
}: {
  scriptUrl: string;
  companionScriptUrls?: string[];
}) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const urls = [...companionScriptUrls, scriptUrl].filter(Boolean);
    if (urls.length === 0) return;

    (async () => {
      for (const url of urls) {
        if (document.querySelector(`script[data-theme-script="${CSS.escape(url)}"]`)) {
          continue;
        }

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.async = false;
          script.dataset.themeScript = url;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load theme script: ${url}`));
          document.body.appendChild(script);
        });
      }

      window.dispatchEvent(new CustomEvent('theme-scripts-ready'));
    })().catch((err) => {
      console.error('[themeEngine] ThemeScripts:', err);
    });
  }, [scriptUrl, companionScriptUrls]);

  return null;
}
