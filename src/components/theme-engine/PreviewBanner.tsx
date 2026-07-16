'use client';

import { useState } from 'react';

/** Shown on the public site only while a Theme Engine preview cookie is active — never for the real active theme. */
export default function PreviewBanner({ slug }: { slug: string }) {
  const [ending, setEnding] = useState(false);

  const exitPreview = async () => {
    setEnding(true);
    try {
      await fetch('/api/theme-engine/preview', { method: 'DELETE' });
    } finally {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '8px 16px',
        background: '#111827',
        color: '#fff',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span>
        Previewing theme <strong>{slug}</strong> — this is not what visitors currently see.
      </span>
      <button
        onClick={exitPreview}
        disabled={ending}
        style={{
          background: '#fff',
          color: '#111827',
          border: 'none',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: ending ? 'default' : 'pointer',
        }}
      >
        {ending ? 'Exiting…' : 'Exit Preview'}
      </button>
    </div>
  );
}
