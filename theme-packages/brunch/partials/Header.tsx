// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Header({ theme }: { theme: any }) {
  const settings = theme.settings();
  const brand = String(settings.brandName || theme.site().name || 'BRUNCH');
  const items = theme.navigation('primary');

  const defaultNav = [
    { id: 'welcome', label: 'Welcome', url: '#top' },
    { id: 'menu', label: 'Menu', url: '#menu' },
    { id: 'events', label: 'Events', url: '#events' },
    { id: 'contact', label: 'Contact', url: '#contact' },
  ];

  const navItems = items.length > 0 ? items : defaultNav;

  return (
    <header className="br-header">
      <div className="br-container br-header__inner">
        <a className="br-logo" href="/">
          {brand.toUpperCase()}
        </a>
        <nav aria-label="Primary">
          <ul className="br-nav">
            {navItems.map((item: { id: string; label: string; url: string }) => (
              <li key={item.id}>
                <a href={item.url}>{item.label.toUpperCase()}</a>
              </li>
            ))}
          </ul>
        </nav>
        <button className="br-menu-toggle" type="button" aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
