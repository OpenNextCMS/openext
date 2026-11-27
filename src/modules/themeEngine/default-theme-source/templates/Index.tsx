/**
 * Theme Engine's built-in default/fallback template (spec §4.13).
 *
 * Deliberately declares no header/footer partials in theme.json — ThemeAPI's
 * own minimal built-in default already covers that. This package only renders
 * the page's actual CMS content — no misleading "fallback" banner on normal
 * renders (that notice is shown by RenderedPublicPage when usedFallback=true).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- theme source is compiled independently of the app's own types (ThemeComponent = React.ComponentType<any>, spec §4.6).
export default function Index({ theme }: { theme: any }) {
  const blocks = theme.blocks();
  return (
    <div className="theme-engine-default-theme">
      <main>
        {Array.isArray(blocks) && blocks.length > 0 ? (
          blocks
        ) : (
          <section style={{ padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 36 }}>Welcome</h1>
            <p style={{ margin: 0, color: '#4b5563' }}>
              This page has no content yet.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
