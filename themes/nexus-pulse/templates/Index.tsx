export default function Index({ theme }: { theme: any }) {
  const site = theme.site();
  const blocks = theme.blocks();

  return (
    <div className="nexus-theme">
      <div className="nexus-glow nexus-glow--one" aria-hidden="true" />
      <div className="nexus-glow nexus-glow--two" aria-hidden="true" />

      {theme.header()}

      <main>
        {Array.isArray(blocks) && blocks.length > 0 ? (
          blocks
        ) : (
          <section className="nexus-hero">
            <div className="nexus-hero__inner">
              <span className="nexus-badge">Welcome</span>
              <h1 className="nexus-hero__title">
                {site.name || 'Your Theme'}
                <span className="nexus-hero__highlight"> is almost ready</span>
              </h1>
              <p className="nexus-hero__desc">
                Activate this theme and add sections from the block editor to see your
                homepage come to life here.
              </p>
            </div>
          </section>
        )}
      </main>

      {theme.footer()}
    </div>
  );
}
