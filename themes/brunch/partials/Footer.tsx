// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Footer({ theme }: { theme: any }) {
  const name = String(theme.settings().brandName || theme.site().name || 'Brunch');
  const year = new Date().getFullYear();

  return (
    <footer className="br-footer" id="contact">
      <div className="br-container br-footer__inner">
        <span>
          © {year} {name}. Indian traditional flavours.
        </span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
