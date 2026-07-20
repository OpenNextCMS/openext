/**
 * Breez homepage — exact pastel wellness landing layout.
 * When editable sections are seeded, theme.blocks() renders the same section components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Index({ theme }: { theme: any }) {
  const blocks = theme.blocks();

  if (Array.isArray(blocks) && blocks.length > 0) {
    return <main className="bz-page">{blocks}</main>;
  }

  // Gallery / card-preview fallback — same visual language as the section renderers.
  return (
    <main className="bz-page">
      <section className="bz-hero" id="top">
        <div className="bz-hero__copy">
          <h1>Mindfulness for Everyone, Anywhere</h1>
          <p>
            Find calm in every moment with guided sessions, live classes, and a community built for
            everyday mindfulness — at home or on the go.
          </p>
          <div className="bz-hero__cta-row">
            <a className="bz-btn bz-btn--navy" href="#start">
              Start Now
            </a>
            <a className="bz-video-link" href="#video">
              <span className="bz-video-link__icon" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1.5v7l6-3.5z" />
                </svg>
              </span>
              Watch video presentation
            </a>
          </div>
        </div>
        <div className="bz-hero__visual">
          <div className="bz-frame bz-hero__frame">
            <img
              src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80"
              alt="Couple meditating on the beach"
            />
          </div>
        </div>
      </section>

      <section className="bz-experience" id="experience">
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
        </svg>
        <div className="bz-container">
          <div className="bz-experience__heading">
            <h2>The Breez Experience</h2>
            <p>
              A calm, connected practice designed for real life — teachers, styles, and livestreams
              that meet you where you are.
            </p>
          </div>
          <div className="bz-experience__grid">
            <article className="bz-card">
              <img
                src="https://images.unsplash.com/photo-1593811167562-9cefbbc5e8d3?auto=format&fit=crop&w=900&q=80"
                alt="Meditation teacher"
              />
              <h3>A Diverse Network of Teachers</h3>
              <p>Learn from experienced guides across traditions, time zones, and teaching styles.</p>
            </article>
            <article className="bz-card">
              <img
                src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80"
                alt="Yoga practice"
              />
              <h3>Different Styles for All</h3>
              <p>From breathwork to gentle yoga flows — find the practice that fits your energy today.</p>
            </article>
            <article className="bz-card">
              <img
                src="https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80"
                alt="Livestream class"
              />
              <h3>Livestream Classes</h3>
              <p>Join live sessions with community energy, or revisit recordings whenever you need calm.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bz-together" id="together">
        <div className="bz-together__visual">
          <div className="bz-frame bz-together__frame">
            <img
              src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80"
              alt="Woman meditating indoors"
            />
          </div>
        </div>
        <div className="bz-together__copy">
          <h2>Meditate Together Online</h2>
          <p>
            Share stillness with people around the world. Join live group sits, guided journeys, and
            community check-ins that make mindfulness feel less solitary.
          </p>
          <p>
            Whether you are beginning or deepening your practice, Breez keeps you connected — with
            gentle structure, warm guidance, and space to breathe.
          </p>
          <a className="bz-btn bz-btn--navy" href="#together">
            Start Now
          </a>
        </div>
      </section>

      <section className="bz-plans" id="plans">
        <div className="bz-plans__copy">
          <h2>Our Plans</h2>
          <p>
            Choose a membership that fits your rhythm. Cancel anytime on monthly, or save with a
            yearly practice commitment.
          </p>
        </div>
        <div className="bz-plans__panel">
          <div className="bz-plans__cards">
            <article className="bz-price-card">
              <p className="bz-price-card__label">Monthly Plan</p>
              <p className="bz-price-card__desc">
                Flexible access with new classes every week. Cancel anytime.
              </p>
              <div className="bz-price-card__price">$29</div>
              <a className="bz-btn bz-btn--ghost-light" href="#monthly">
                Get Now
              </a>
            </article>
            <article className="bz-price-card">
              <p className="bz-price-card__label">Yearly Plan</p>
              <p className="bz-price-card__desc">
                Best value for dedicated practice. Limited-time savings.
              </p>
              <div className="bz-price-card__price">$250</div>
              <a className="bz-btn bz-btn--ghost-light" href="#yearly">
                Get Now
              </a>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
