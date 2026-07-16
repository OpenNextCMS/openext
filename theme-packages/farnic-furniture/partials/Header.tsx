export default function Header({ theme }: { theme: any }) {
  const site = theme.site();
  const nav = theme.navigation('primary') as { id: string; label: string; url: string }[];

  return (
    <header className="fn-header">
      <div className="fn-container fn-header__inner">
        <a href="/" className="fn-logo">
          <span className="fn-logo__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="6" y="4" width="20" height="24" rx="2" />
              <line x1="6" y1="13" x2="26" y2="13" />
              <line x1="6" y1="21" x2="26" y2="21" />
              <line x1="12" y1="8.5" x2="16" y2="8.5" />
              <line x1="12" y1="17" x2="16" y2="17" />
            </svg>
          </span>
          <span className="fn-logo__text">
            <strong>{site.name || 'Farnic'}</strong>
            <em>Furniture</em>
          </span>
        </a>

        <nav className="fn-nav" aria-label="Primary">
          {(nav && nav.length > 0 ? nav : DEFAULT_LINKS).map((item) => (
            <a key={item.id ?? item.url} href={item.url || '#'} className="fn-nav__link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="fn-header__actions">
          <button type="button" className="fn-icon-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button type="button" className="fn-icon-btn" aria-label="Cart">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
          <a href="/shop" className="fn-btn fn-btn--primary fn-btn--sm">
            Shop Now
          </a>
        </div>
      </div>
    </header>
  );
}

const DEFAULT_LINKS = [
  { id: 'home', label: 'Home', url: '/' },
  { id: 'shop', label: 'Shop', url: '/shop' },
  { id: 'categories', label: 'Categories', url: '/categories' },
  { id: 'blog', label: 'Blog', url: '/blog' },
  { id: 'contact', label: 'Contact', url: '/contact' },
];
