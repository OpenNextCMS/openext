// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function GalleryRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const heading = String(d.heading || 'India');
  const emphasis = String(d.headingEmphasis || 'on your plate');
  const images = Array.isArray(d.images)
    ? (d.images as Array<{ image?: string; alt?: string }>)
    : [
        {
          image:
            'https://images.unsplash.com/photo-1601050690597-df0565f70950?auto=format&fit=crop&w=500&q=80',
          alt: 'Samosas',
        },
        {
          image:
            'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
          alt: 'Curry',
        },
        {
          image:
            'https://images.unsplash.com/photo-1563379091339-03246963d29a?auto=format&fit=crop&w=500&q=80',
          alt: 'Biryani',
        },
      ];

  return (
    <section className="br-gallery">
      <div className="br-container">
        <div className="br-gallery__heading">
          <h2>
            {heading} <em>{emphasis}</em>
          </h2>
        </div>
        <div className="br-gallery__grid">
          {images.map((item, i) => (
            <div
              key={item.alt || i}
              className={`br-gallery__item${i === 1 ? ' br-gallery__item--center' : ''}`}
            >
              <img src={String(item.image || '')} alt={String(item.alt || '')} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
