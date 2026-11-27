'use client';
import { apiUrl } from '@/lib/apiClient';

import { useState } from 'react';

/** Shown on the public site only while a Theme Engine preview cookie is active — never for the real active theme. */
export default function PreviewBanner({
  slug,
  themeName,
}: {
  slug: string;
  themeName?: string;
}) {
  const [ending, setEnding] = useState(false);
  const [activating, setActivating] = useState(false);

  const exitPreview = async () => {
    setEnding(true);
    try {
      await fetch(apiUrl('/api/theme-engine/preview'), { method: 'DELETE' });
    } finally {
      window.location.reload();
    }
  };

  const activateTheme = async () => {
    setActivating(true);
    try {
      await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/activate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyToEditor: false }),
      });
      await fetch(apiUrl('/api/theme-engine/preview'), { method: 'DELETE' });
      window.location.reload();
    } catch {
      setActivating(false);
    }
  };

  const label = themeName || slug;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 16px',
        background: '#111827',
        color: '#fff',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span>
        Previewing: <strong>{label}</strong> — visitors still see the active theme.
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={activateTheme}
          disabled={activating || ending}
          style={{
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: activating || ending ? 'default' : 'pointer',
          }}
        >
          {activating ? 'Activating…' : 'Activate Theme'}
        </button>
        <button
          onClick={exitPreview}
          disabled={ending || activating}
          style={{
            background: '#fff',
            color: '#111827',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: ending || activating ? 'default' : 'pointer',
          }}
        >
          {ending ? 'Exiting…' : 'Exit Preview'}
        </button>
      </div>
    </div>
  );
}
