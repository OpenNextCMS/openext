/**
 * Brunch restaurant homepage — Indian cuisine landing layout.
 * When editable sections are seeded, theme.blocks() renders the section components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Index({ theme }: { theme: any }) {
  const blocks = theme.blocks();

  if (Array.isArray(blocks) && blocks.length > 0) {
    return <main className="br-page">{blocks}</main>;
  }

  return (
    <main className="br-page">
      <section
        className="br-hero"
        id="top"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        <div className="br-hero__card">
          <h1>
            Brunch <em>Full Website</em>
          </h1>
          <p>Indian Cuisine</p>
          <a className="br-btn br-btn--dark" href="#menu">
            Read More
          </a>
        </div>
      </section>

      <section className="br-intro" id="welcome">
        <svg className="br-intro__mandala br-intro__mandala--tl" viewBox="0 0 100 100" aria-hidden="true">
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
        <div className="br-intro__inner">
          <div className="br-intro__copy">
            <h2>Indian traditional flavours</h2>
            <p>
              Experience authentic spices, time-honoured recipes, and the warmth of Indian hospitality.
              Every dish tells a story of tradition passed down through generations.
            </p>
            <div className="br-intro__dots">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="br-intro__image">
            <img
              src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80"
              alt="Indian spices"
            />
          </div>
        </div>
      </section>

      <section className="br-features">
        <div className="br-container">
          <div className="br-features__grid">
            <article className="br-feature">
              <svg className="br-feature__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M24 4 L44 40 H4 Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <h3>Best Quality</h3>
              <p>Fresh ingredients sourced daily from trusted local suppliers and spice merchants.</p>
            </article>
            <article className="br-feature">
              <svg className="br-feature__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M24 12 V24 L32 28" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <h3>Traditional Recipes</h3>
              <p>Authentic family recipes prepared with care by our experienced chefs.</p>
            </article>
            <article className="br-feature">
              <svg className="br-feature__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M8 36 Q24 8 40 36" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              <h3>Warm Atmosphere</h3>
              <p>A welcoming space where every guest feels at home from the moment they arrive.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="br-menu" id="menu">
        <div className="br-container">
          <div className="br-menu__heading">
            <h2>
              Discover <em>our new menu</em>
            </h2>
          </div>
          <div className="br-menu__layout">
            <div className="br-menu__circle">
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80"
                alt="Spices"
              />
            </div>
            <div className="br-menu__list">
              {[
                {
                  name: 'Veg Samosa',
                  desc: 'Crispy pastry filled with spiced potatoes and peas.',
                  price: '$8',
                  img: 'https://images.unsplash.com/photo-1601050690597-df0565f70950?auto=format&fit=crop&w=120&q=80',
                },
                {
                  name: 'Chicken Tikka',
                  desc: 'Marinated chicken grilled in tandoor with aromatic spices.',
                  price: '$16',
                  img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=120&q=80',
                },
                {
                  name: 'Lamb Biryani',
                  desc: 'Fragrant basmati rice layered with tender lamb and saffron.',
                  price: '$22',
                  img: 'https://images.unsplash.com/photo-1563379091339-03246963d29a?auto=format&fit=crop&w=120&q=80',
                },
                {
                  name: 'Butter Chicken',
                  desc: 'Creamy tomato curry with tender tandoori chicken pieces.',
                  price: '$18',
                  img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=120&q=80',
                },
              ].map((item) => (
                <article key={item.name} className="br-menu-item">
                  <div className="br-menu-item__thumb">
                    <img src={item.img} alt={item.name} />
                  </div>
                  <div className="br-menu-item__body">
                    <h4>{item.name}</h4>
                    <p>{item.desc}</p>
                    <span className="br-menu-item__price">{item.price}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="br-visual"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1920&q=80')",
        }}
      />

      <section className="br-booking" id="events">
        <div className="br-container">
          <div className="br-booking__heading">
            <h2>Book here</h2>
          </div>
          <form className="br-booking__form">
            <div className="br-field">
              <label htmlFor="br-name">Name</label>
              <input id="br-name" type="text" placeholder="Your name" />
            </div>
            <div className="br-field">
              <label htmlFor="br-people">People</label>
              <select id="br-people">
                <option>2 people</option>
                <option>4 people</option>
                <option>6 people</option>
              </select>
            </div>
            <div className="br-field">
              <label htmlFor="br-date">Date</label>
              <input id="br-date" type="date" />
            </div>
            <div className="br-field">
              <label htmlFor="br-phone">Phone</label>
              <input id="br-phone" type="tel" placeholder="+1 000 000 0000" />
            </div>
            <div className="br-field">
              <label htmlFor="br-email">Email</label>
              <input id="br-email" type="email" placeholder="you@email.com" />
            </div>
            <div className="br-field">
              <label htmlFor="br-time">Time</label>
              <select id="br-time">
                <option>18:00</option>
                <option>19:00</option>
                <option>20:00</option>
              </select>
            </div>
            <div className="br-booking__submit">
              <button type="button" className="br-btn br-btn--outline">
                Submit
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="br-gallery">
        <div className="br-container">
          <div className="br-gallery__heading">
            <h2>
              India <em>on your plate</em>
            </h2>
          </div>
          <div className="br-gallery__grid">
            <div className="br-gallery__item">
              <img
                src="https://images.unsplash.com/photo-1601050690597-df0565f70950?auto=format&fit=crop&w=500&q=80"
                alt="Samosas"
              />
            </div>
            <div className="br-gallery__item br-gallery__item--center">
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80"
                alt="Curry"
              />
            </div>
            <div className="br-gallery__item">
              <img
                src="https://images.unsplash.com/photo-1563379091339-03246963d29a?auto=format&fit=crop&w=500&q=80"
                alt="Biryani"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
