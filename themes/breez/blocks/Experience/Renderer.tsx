function Scribble() {
  return (
    <svg
      className="bz-scribble bz-scribble--experience"
      viewBox="0 0 1200 180"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 90 C120 20, 220 160, 320 90 S520 20, 620 90 820 160, 920 90 1120 20, 1180 90"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M40 110 C140 40, 240 170, 340 110 S540 40, 640 110 840 170, 940 110 1120 50, 1160 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ExperienceRenderer({
  data,
  block,
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const d = data || block?.data || {};
  const backgroundColor = String(d.backgroundColor || '#e8ecf8');
  const headingColor = String(d.headingColor || '#2b3142');
  const fontColor = String(d.fontColor || '#6b7288');
  const items = Array.isArray(d.items)
    ? (d.items as Array<{ title?: string; text?: string; image?: string }>)
    : [
        {
          title: 'A Diverse Network of Teachers',
          text: 'Learn from experienced guides across traditions, time zones, and teaching styles.',
          image:
            'https://images.unsplash.com/photo-1593811167562-9cefbbc5e8d3?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: 'Different Styles for All',
          text: 'From breathwork to gentle yoga flows — find the practice that fits your energy today.',
          image:
            'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
        },
        {
          title: 'Livestream Classes',
          text: 'Join live sessions with community energy, or revisit recordings whenever you need calm.',
          image:
            'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80',
        },
      ];

  return (
    <section className="bz-experience" id="experience" style={{ backgroundColor }}>
      <Scribble />
      <div className="bz-container">
        <div className="bz-experience__heading">
          <h2 style={{ color: headingColor }}>{String(d.title || 'The Breez Experience')}</h2>
          <p style={{ color: fontColor }}>
            {String(
              d.subtitle ||
                'A calm, connected practice designed for real life — teachers, styles, and livestreams that meet you where you are.'
            )}
          </p>
        </div>
        <div className="bz-experience__grid">
          {items.map((item, index) => (
            <article key={`${item.title || 'card'}-${index}`} className="bz-card">
              <img
                src={
                  item.image ||
                  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80'
                }
                alt={item.title || 'Breez experience'}
              />
              <h3 style={{ color: headingColor }}>{item.title || 'Feature'}</h3>
              <p style={{ color: fontColor }}>{item.text || ''}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
