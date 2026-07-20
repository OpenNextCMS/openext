/**
 * Theme Engine's built-in default/fallback template (spec §4.13).
 *
 * Deliberately declares no header/footer partials in theme.json — ThemeAPI's
 * own minimal built-in default (site name + a copyright line, spec §4.10's
 * "render Header/Footer (or default)") already covers that, so this package
 * only needs to render the page's actual content.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- theme source is compiled independently of the app's own types (ThemeComponent = React.ComponentType<any>, spec §4.6).
export default function Index({ theme }: { theme: any }) {
  const blocks = theme.blocks();
  return (
    <div className="theme-engine-default-theme">
      <p
        data-theme-engine-fallback-notice="true"
        style={{ padding: '8px 16px', fontSize: '13px', background: '#fef3c7', color: '#92400e', margin: 0 }}
      >
        This page is showing the default fallback theme because the active theme failed to render.
      </p>
      <main>
        {Array.isArray(blocks) && blocks.length > 0 ? (
          blocks
        ) : (
          <section style={{ padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 36 }}>Welcome</h1>
            <p style={{ margin: 0, color: '#4b5563' }}>
              This is the Theme Engine default fallback theme.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
