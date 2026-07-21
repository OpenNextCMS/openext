// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HeroRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const title = String(d.title || 'Mindfulness for Everyone, Anywhere');
  const description = String(
    d.description ||
      'Find calm in every moment with guided sessions, live classes, and a community built for everyday mindfulness — at home or on the go.'
  );
  const ctaLabel = String(d.ctaLabel || 'Start Now');
  const ctaHref = String(d.ctaHref || '#start');
  const videoLabel = String(d.videoLabel || 'Watch video presentation');
  const videoHref = String(d.videoHref || '#video');
  const backgroundColor = String(d.backgroundColor || '#ffffff');
  const headingColor = String(d.headingColor || '#2b3142');
  const fontColor = String(d.fontColor || '#6b7288');
  const buttonColor = String(d.buttonColor || '#2b3142');
  const buttonTextColor = String(d.buttonTextColor || '#ffffff');
  const portrait = String(
    d.portraitImage ||
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'
  );
  const sky = String(
    d.skyImage ||
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80'
  );

  return (
    <section className="bz-hero" id="top">
      <div className="bz-hero__copy" style={{ backgroundColor }}>
        <h1 style={{ color: headingColor }}>{title}</h1>
        <p style={{ color: fontColor }}>{description}</p>
        <div className="bz-hero__cta-row">
          <a
            className="bz-btn bz-btn--navy"
            href={ctaHref}
            style={{ backgroundColor: buttonColor, color: buttonTextColor }}
          >
            {ctaLabel}
          </a>
          <a className="bz-video-link" href={videoHref} style={{ color: headingColor }}>
            <span className="bz-video-link__icon" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1.5v7l6-3.5z" />
              </svg>
            </span>
            {videoLabel}
          </a>
        </div>
      </div>
      <div
        className="bz-hero__visual"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(255,186,160,0.35), rgba(244,168,148,0.12)), url('${sky}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="bz-frame bz-hero__frame">
          <img src={portrait} alt="Couple meditating on the beach" />
        </div>
      </div>
    </section>
  );
}
