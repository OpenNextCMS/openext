// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Footer({ theme }: { theme: any }) {
  const name = String(theme.settings().brandName || theme.site().name || 'Breez');
  return (
    <footer className="bz-footer">
      <div className="bz-container bz-footer__inner">
        <span>
          © {new Date().getFullYear()} {name}. Mindfulness for everyone.
        </span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
