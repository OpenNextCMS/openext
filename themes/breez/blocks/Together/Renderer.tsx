// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TogetherRenderer({
  data,
  block,
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const d = data || block?.data || {};
  const backgroundColor = String(d.backgroundColor || '#ffffff');
  const imagePanelColor = String(d.imagePanelColor || '#f4a894');
  const headingColor = String(d.headingColor || '#2b3142');
  const fontColor = String(d.fontColor || '#6b7288');
  const buttonColor = String(d.buttonColor || '#2b3142');
  const buttonTextColor = String(d.buttonTextColor || '#ffffff');
  const image = String(
    d.image ||
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80'
  );

  return (
    <section className="bz-together" id="together">
      <div className="bz-together__visual" style={{ backgroundColor: imagePanelColor }}>
        <div className="bz-frame bz-together__frame">
          <img src={image} alt="Woman meditating indoors" />
        </div>
      </div>
      <div className="bz-together__copy" style={{ backgroundColor }}>
        <h2 style={{ color: headingColor }}>{String(d.title || 'Meditate Together Online')}</h2>
        <p style={{ color: fontColor }}>
          {String(
            d.paragraph1 ||
              'Share stillness with people around the world. Join live group sits, guided journeys, and community check-ins that make mindfulness feel less solitary.'
          )}
        </p>
        <p style={{ color: fontColor }}>
          {String(
            d.paragraph2 ||
              'Whether you are beginning or deepening your practice, Breez keeps you connected — with gentle structure, warm guidance, and space to breathe.'
          )}
        </p>
        <a
          className="bz-btn bz-btn--navy"
          href={String(d.ctaHref || '#together')}
          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
        >
          {String(d.ctaLabel || 'Start Now')}
        </a>
      </div>
    </section>
  );
}
