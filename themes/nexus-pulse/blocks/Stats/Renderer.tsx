export default function StatsRenderer({
  data,
  block
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const values = data || block?.data || {};

  const fallback = [
    { icon: '⚡', value: '10k+', label: 'Active teams' },
    { icon: '🚀', value: '99.9%', label: 'Uptime' },
    { icon: '⭐', value: '4.9/5', label: 'Average rating' },
    { icon: '🌍', value: '40+', label: 'Countries served' }
  ];

  const items = Array.isArray(values.items) && values.items.length > 0 ? values.items : fallback;

  return (
    <section className="nexus-stats">
      <div className="nexus-stats__inner">
        {items.map((item: any, index: number) => (
          <div className="nexus-stat-card" data-animate key={index}>
            <span className="nexus-stat-card__icon" aria-hidden="true">
              {String(item?.icon || '✦')}
            </span>
            <span className="nexus-stat-card__value">{String(item?.value || '')}</span>
            <span className="nexus-stat-card__label">{String(item?.label || '')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
