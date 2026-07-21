function FeatureIcon({ index }: { index: number }) {
  if (index === 1) {
    return (
      <>
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M24 12 V24 L32 28" stroke="currentColor" strokeWidth="1.5" />
      </>
    );
  }
  if (index === 2) {
    return <path d="M8 36 Q24 8 40 36" stroke="currentColor" strokeWidth="1.5" fill="none" />;
  }
  return <path d="M24 4 L44 40 H4 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FeaturesRenderer({
  data,
  block,
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const d = data || block?.data || {};
  const items = Array.isArray(d.items)
    ? (d.items as Array<{ title?: string; text?: string }>)
    : [
        { title: 'Best Quality', text: 'Fresh ingredients sourced daily.' },
        { title: 'Traditional Recipes', text: 'Authentic family recipes.' },
        { title: 'Warm Atmosphere', text: 'A welcoming space for every guest.' },
      ];

  return (
    <section className="br-features">
      <div className="br-container">
        <div className="br-features__grid">
          {items.map((item, i) => (
            <article key={item.title || i} className="br-feature">
              <svg className="br-feature__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <FeatureIcon index={i} />
              </svg>
              <h3>{String(item.title || '')}</h3>
              <p>{String(item.text || '')}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
