function LogoMark() {
  return (
    <svg className="bz-logo__mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 11 L22 23 H10 Z" fill="currentColor" opacity="0.18" />
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Header({ theme }: { theme: any }) {
  const settings = theme.settings();
  const brand = String(settings.brandName || theme.site().name || 'BREEZ');
  const coral = String(settings.accentCoral || '#F07A64');

  return (
    <header className="bz-header">
      <div className="bz-container bz-header__inner">
        <a className="bz-logo" href="/">
          <LogoMark />
          <span>{brand.toUpperCase()}</span>
        </a>
        <div className="bz-header__actions">
          <a className="bz-header__link" href="#login">
            Login
          </a>
          <a className="bz-btn bz-btn--coral" href="#join" style={{ background: coral }}>
            Join Now
          </a>
          <button className="bz-menu-btn" type="button" aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
