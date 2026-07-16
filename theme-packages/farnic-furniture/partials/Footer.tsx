export default function Footer({ theme }: { theme: any }) {
  const site = theme.site();
  const year = new Date().getFullYear();

  return (
    <footer className="fn-footer">
      <div className="fn-container fn-footer__grid">
        <div className="fn-footer__brand">
          <span className="fn-logo__text fn-logo__text--light">
            <strong>{site.name || 'Farnic'}</strong>
            <em>Furniture</em>
          </span>
          <p>{site.description || 'Classic and elegant furniture for the modern home.'}</p>
        </div>

        <div className="fn-footer__col">
          <h4>Shop</h4>
          <a href="/shop">All Products</a>
          <a href="/categories">Categories</a>
          <a href="/shop?filter=best-sellers">Best Sellers</a>
          <a href="/shop?filter=new">New Arrivals</a>
        </div>

        <div className="fn-footer__col">
          <h4>Company</h4>
          <a href="/about">About Us</a>
          <a href="/blog">Blog</a>
          <a href="/contact">Contact</a>
          <a href="/faq">FAQ</a>
        </div>

        <div className="fn-footer__col">
          <h4>Stay in touch</h4>
          <p>Get updates on new collections and offers.</p>
          <form className="fn-footer__newsletter">
            <input type="email" placeholder="Your email address" aria-label="Email address" />
            <button type="submit" className="fn-btn fn-btn--primary fn-btn--sm">
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="fn-footer__bottom">
        <div className="fn-container fn-footer__bottom-inner">
          <span>
            © {year} {site.name || 'Farnic Furniture'}. All rights reserved.
          </span>
          <span className="fn-footer__made-with">Built with the OpenNext Theme Engine</span>
        </div>
      </div>
    </footer>
  );
}
