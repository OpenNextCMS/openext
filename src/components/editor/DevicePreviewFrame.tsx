'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DevicePreviewFrameProps {
  /** Device viewport width in px (e.g. 480 mobile, 768 tablet). */
  width: number;
  children: React.ReactNode;
}

/**
 * Renders editor blocks inside a same-origin iframe sized to a device width.
 *
 * Why an iframe: Tailwind's responsive breakpoints (sm/md/lg/xl) are viewport
 * media queries. Merely shrinking a div on a wide desktop never re-triggers
 * them, so multi-column components stay expanded and overflow the "mobile"
 * frame. An iframe establishes its own viewport, so the exact same components
 * collapse/stack just as they will on a real phone or tablet — giving an
 * accurate cross-device preview with no per-component changes.
 *
 * Parent stylesheets are cloned in (and kept in sync for dev HMR), and the
 * content is portaled so it preserves the app's React context (Redux store,
 * providers, etc.).
 */
export function DevicePreviewFrame({ width, children }: DevicePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;

    doc.documentElement.setAttribute('lang', 'en');
    doc.body.style.margin = '0';
    doc.body.style.background = '#ffffff';

    // Clone every stylesheet from the host document so utility classes,
    // theme variables and fonts resolve identically inside the iframe.
    const syncStyles = () => {
      doc.querySelectorAll('[data-preview-style]').forEach((n) => n.remove());
      document.head
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute('data-preview-style', '');
          doc.head.appendChild(clone);
        });
    };

    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true });

    setBody(doc.body);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Responsive device preview"
        className="mx-auto block h-full bg-white shadow-md transition-all duration-300"
        style={{ width, border: 0, maxWidth: '100%' }}
      />
      {body && createPortal(children, body)}
    </>
  );
}

export default DevicePreviewFrame;
