function Scribble() {
  return (
    <svg
      className="bz-scribble bz-scribble--plans"
      viewBox="0 0 600 220"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 160 C80 40, 160 200, 240 100 S400 20, 480 120 560 200, 590 90"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M40 180 C120 60, 200 210, 290 120 S450 40, 560 150"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.65"
      />
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PlansRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const backgroundColor = String(d.backgroundColor || '#ffffff');
  const panelBackgroundColor = String(d.panelBackgroundColor || '#e4f3ee');
  const headingColor = String(d.headingColor || '#2b3142');
  const fontColor = String(d.fontColor || '#6b7288');
  const cardBackgroundColor = String(d.cardBackgroundColor || '#2b3142');
  const cardFontColor = String(d.cardFontColor || '#ffffff');
  const plans = Array.isArray(d.plans)
    ? (d.plans as Array<{
        label?: string;
        description?: string;
        price?: string;
        ctaLabel?: string;
        ctaHref?: string;
      }>)
    : [
        {
          label: 'Monthly Plan',
          description: 'Flexible access with new classes every week. Cancel anytime.',
          price: '$29',
          ctaLabel: 'Get Now',
          ctaHref: '#monthly',
        },
        {
          label: 'Yearly Plan',
          description: 'Best value for dedicated practice. Limited-time savings.',
          price: '$250',
          ctaLabel: 'Get Now',
          ctaHref: '#yearly',
        },
      ];

  return (
    <section className="bz-plans" id="plans">
      <div className="bz-plans__copy" style={{ backgroundColor }}>
        <h2 style={{ color: headingColor }}>{String(d.title || 'Our Plans')}</h2>
        <p style={{ color: fontColor }}>
          {String(
            d.description ||
              'Choose a membership that fits your rhythm. Cancel anytime on monthly, or save with a yearly practice commitment.'
          )}
        </p>
      </div>
      <div className="bz-plans__panel" style={{ backgroundColor: panelBackgroundColor }}>
        <Scribble />
        <div className="bz-plans__cards">
          {plans.map((plan, index) => (
            <article
              key={`${plan.label || 'plan'}-${index}`}
              className="bz-price-card"
              style={{ backgroundColor: cardBackgroundColor, color: cardFontColor }}
            >
              <p className="bz-price-card__label">{plan.label || 'Plan'}</p>
              <p className="bz-price-card__desc">{plan.description || ''}</p>
              <div className="bz-price-card__price">{plan.price || '$0'}</div>
              <a className="bz-btn bz-btn--ghost-light" href={plan.ctaHref || '#'}>
                {plan.ctaLabel || 'Get Now'}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
