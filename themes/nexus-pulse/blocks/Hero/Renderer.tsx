export default function HeroRenderer({
  data,
  block
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const values = data || block?.data || {};

  const badge = String(values.badge || 'Now in public beta');
  const title = String(values.title || 'Build products your users');
  const highlight = String(values.highlight || 'actually love');
  const description = String(
    values.description ||
      'Nexus Pulse gives your team the tools to ship faster, iterate smarter, and delight every single user.'
  );
  const accent = String(values.accent || '#7c5cff');
  const accent2 = String(values.accent2 || '#38bdf8');

  const showPrimaryCta = values.showPrimaryCta !== false;
  const primaryCtaLabel = String(values.primaryCtaLabel || 'Get Started');
  const primaryCtaHref = String(values.primaryCtaHref || '#get-started');

  const showSecondaryCta = values.showSecondaryCta !== false;
  const secondaryCtaLabel = String(values.secondaryCtaLabel || 'Watch demo');
  const secondaryCtaHref = String(values.secondaryCtaHref || '#demo');

  const backgroundImage = String(values.backgroundImage || '');

  return (
    <section
      className="nexus-hero"
      style={
        backgroundImage
          ? {
              backgroundImage: `radial-gradient(ellipse at top, rgba(5,6,10,0.7), rgba(5,6,10,0.95)), url(${backgroundImage})`
            }
          : undefined
      }
    >
      <div className="nexus-hero__inner">
        <span className="nexus-badge" data-animate>
          <span className="nexus-badge__dot" />
          {badge}
        </span>

        <h1
          className="nexus-hero__title"
          data-animate
          style={
            {
              '--nexus-accent': accent,
              '--nexus-accent-2': accent2
            } as any
          }
        >
          {title}
          <span className="nexus-hero__highlight"> {highlight}</span>
        </h1>

        <p className="nexus-hero__desc" data-animate>
          {description}
        </p>

        <div className="nexus-hero__actions" data-animate>
          {showPrimaryCta ? (
            <a
              href={primaryCtaHref}
              className="nexus-btn nexus-btn--primary"
              style={{
                backgroundImage: `linear-gradient(135deg, ${accent}, ${accent2})`
              }}
            >
              {primaryCtaLabel}
            </a>
          ) : null}
          {showSecondaryCta ? (
            <a href={secondaryCtaHref} className="nexus-btn nexus-btn--ghost">
              <span className="nexus-btn__play" aria-hidden="true" />
              {secondaryCtaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
