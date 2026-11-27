interface MarketplacePreviewUnavailableProps {
  slug: string;
  themeName: string;
  message: string;
}

export default function MarketplacePreviewUnavailable({
  slug,
  themeName,
  message,
}: MarketplacePreviewUnavailableProps) {
  return (
    <div
      data-theme-engine-card-preview={slug}
      data-preview-unavailable="true"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: 'linear-gradient(135deg, #111827, #1f2937)',
        color: '#f9fafb',
      }}
    >
      <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
        <p style={{ color: '#86efac', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Preview unavailable
        </p>
        <h1 style={{ marginTop: '0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>{themeName}</h1>
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.6 }}>
          {message}
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          Ensure OpeNext CMS is running and the theme package exists in <code>src/themes/[slug]/&#123;slug&#125;/</code>.
        </p>
      </div>
    </div>
  );
}
