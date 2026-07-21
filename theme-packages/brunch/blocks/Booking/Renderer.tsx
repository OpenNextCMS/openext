// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BookingRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const heading = String(d.heading || 'Book here');
  const submitLabel = String(d.submitLabel || 'Submit');

  return (
    <section className="br-booking" id="events">
      <div className="br-container">
        <div className="br-booking__heading">
          <h2>{heading}</h2>
        </div>
        <form className="br-booking__form">
          <div className="br-field">
            <label htmlFor="br-name">Name</label>
            <input id="br-name" type="text" placeholder="Your name" />
          </div>
          <div className="br-field">
            <label htmlFor="br-people">People</label>
            <select id="br-people" defaultValue="2">
              <option value="2">2 people</option>
              <option value="4">4 people</option>
              <option value="6">6 people</option>
              <option value="8">8+ people</option>
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
            <select id="br-time" defaultValue="19:00">
              <option value="18:00">18:00</option>
              <option value="19:00">19:00</option>
              <option value="20:00">20:00</option>
              <option value="21:00">21:00</option>
            </select>
          </div>
          <div className="br-booking__submit">
            <button type="button" className="br-btn br-btn--outline">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
