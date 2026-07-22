export default function CTARenderer({
  data,
  block
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const values = data || block?.data || {};

  const title = String(values.title || 'Ready to jump in?');
  const description = String(
    values.description || 'Start your free trial today. No credit card required.'
  );
  const buttonLabel = String(values.buttonLabel || 'Start free trial');
  const buttonHref = String(values.buttonHref || '#get-started');
  const accent = String(values.accent || '#7c5cff');

  return (
    <section className="nexus-cta" id="get-started">
      <div className="nexus-cta__inner" data-animate>
        <h2 className="nexus-cta__title">{title}</h2>
        <p className="nexus-cta__desc">{description}</p>
        <a
          href={buttonHref}
          className="nexus-btn nexus-btn--primary nexus-cta__btn"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent}, #38bdf8)` }}
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
}
