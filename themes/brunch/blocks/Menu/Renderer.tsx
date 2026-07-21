// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MenuRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const heading = String(d.heading || 'Discover');
  const emphasis = String(d.headingEmphasis || 'our new menu');
  const circle = String(
    d.circleImage ||
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80'
  );
  const items = Array.isArray(d.items)
    ? (d.items as Array<{ name?: string; description?: string; price?: string; image?: string }>)
    : [];

  return (
    <section className="br-menu" id="menu">
      <div className="br-container">
        <div className="br-menu__heading">
          <h2>
            {heading} <em>{emphasis}</em>
          </h2>
        </div>
        <div className="br-menu__layout">
          <div className="br-menu__circle">
            <img src={circle} alt="" />
          </div>
          <div className="br-menu__list">
            {items.map((item) => (
              <article key={item.name} className="br-menu-item">
                <div className="br-menu-item__thumb">
                  <img src={String(item.image || '')} alt={String(item.name || '')} />
                </div>
                <div className="br-menu-item__body">
                  <h4>{String(item.name || '')}</h4>
                  <p>{String(item.description || '')}</p>
                  <span className="br-menu-item__price">{String(item.price || '')}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
