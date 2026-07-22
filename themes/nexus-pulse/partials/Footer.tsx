export default function Footer({ theme }: { theme: any }) {
  const site = theme.site();
  const nav = theme.menu('footer') || theme.menu('primary') || [];
  const year = new Date().getFullYear();

  return (
    <footer className="nexus-footer">
      <div className="nexus-footer__inner">
        <div className="nexus-footer__brand">
          <span className="nexus-logo__mark" aria-hidden="true" />
          <span className="nexus-logo__text">{site.name || 'Nexus Pulse'}</span>
        </div>

        <nav className="nexus-footer__nav" aria-label="Footer">
          {nav.map((item: any) => (
            <a key={item.href} href={item.href} className="nexus-footer__link">
              {item.label}
            </a>
          ))}
        </nav>

        <p className="nexus-footer__copy">
          © {year} {site.name || 'Nexus Pulse'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
