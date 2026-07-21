// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HeroRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const title = String(d.title || 'Brunch');
  const emphasis = String(d.titleEmphasis || 'Full Website');
  const subtitle = String(d.subtitle || 'Indian Cuisine');
  const ctaLabel = String(d.ctaLabel || 'Read More');
  const ctaHref = String(d.ctaHref || '#menu');
  const bg = String(
    d.backgroundImage ||
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1920&q=80'
  );

  return (
    <section className="br-hero" id="top" style={{ backgroundImage: `url('${bg}')` }}>
      <div className="br-hero__card">
        <h1>
          {title} <em>{emphasis}</em>
        </h1>
        <p>{subtitle}</p>
        <a className="br-btn br-btn--dark" href={ctaHref}>
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
