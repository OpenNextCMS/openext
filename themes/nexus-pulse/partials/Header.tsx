export default function Header({ theme }: { theme: any }) {
  const site = theme.site();
  const nav = theme.menu('primary') || [];

  return (
    <header className="nexus-header">
      <div className="nexus-header__inner">
        <a href="/" className="nexus-logo">
          <span className="nexus-logo__mark" aria-hidden="true" />
          <span className="nexus-logo__text">{site.name || 'Nexus Pulse'}</span>
        </a>

        <nav className="nexus-nav" aria-label="Primary">
          {nav.map((item: any) => (
            <a key={item.href} href={item.href} className="nexus-nav__link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nexus-header__actions">
          <a href="#get-started" className="nexus-btn nexus-btn--sm nexus-btn--primary">
            Get Started
          </a>
          <button
            type="button"
            className="nexus-burger"
            data-nexus-menu-toggle
            aria-label="Toggle menu"
            aria-expanded="false"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="nexus-mobile-menu" data-nexus-mobile-menu>
        {nav.map((item: any) => (
          <a key={item.href} href={item.href} className="nexus-mobile-menu__link">
            {item.label}
          </a>
        ))}
        <a href="#get-started" className="nexus-btn nexus-btn--primary nexus-mobile-menu__cta">
          Get Started
        </a>
      </div>
    </header>
  );
}
