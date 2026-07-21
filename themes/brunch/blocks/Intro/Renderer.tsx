function Mandala({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="5"
          x2="50"
          y2="95"
          stroke="currentColor"
          strokeWidth="0.5"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function IntroRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const heading = String(d.heading || 'Indian traditional flavours');
  const body = String(
    d.body ||
      'Experience authentic spices, time-honoured recipes, and the warmth of Indian hospitality.'
  );
  const inset = String(
    d.insetImage ||
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80'
  );

  return (
    <section className="br-intro" id="welcome">
      <Mandala className="br-intro__mandala br-intro__mandala--tl" />
      <Mandala className="br-intro__mandala br-intro__mandala--tr" />
      <div className="br-intro__inner">
        <div className="br-intro__copy">
          <h2>{heading}</h2>
          <p>{body}</p>
          <div className="br-intro__dots">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="br-intro__image">
          <img src={inset} alt="" />
        </div>
      </div>
    </section>
  );
}
