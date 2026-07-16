type IconKind = 'chair' | 'sofa' | 'table' | 'lamp' | 'storage' | 'bed';

function FurnitureIcon({ kind }: { kind: IconKind }) {
  const common = { viewBox: '0 0 48 48', width: 40, height: 40, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 };
  switch (kind) {
    case 'sofa':
      return (
        <svg {...common}>
          <path d="M8 26v8a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2v-8" />
          <path d="M6 26a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v4H6z" />
          <path d="M10 22v-6a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v6" />
          <line x1="12" y1="36" x2="12" y2="40" />
          <line x1="36" y1="36" x2="36" y2="40" />
        </svg>
      );
    case 'table':
      return (
        <svg {...common}>
          <rect x="6" y="14" width="36" height="4" rx="1" />
          <line x1="10" y1="18" x2="10" y2="38" />
          <line x1="38" y1="18" x2="38" y2="38" />
        </svg>
      );
    case 'lamp':
      return (
        <svg {...common}>
          <path d="M14 12 L34 12 L28 24 L20 24 Z" />
          <line x1="24" y1="24" x2="24" y2="38" />
          <line x1="16" y1="40" x2="32" y2="40" />
        </svg>
      );
    case 'storage':
      return (
        <svg {...common}>
          <rect x="10" y="6" width="28" height="36" rx="2" />
          <line x1="10" y1="18" x2="38" y2="18" />
          <line x1="10" y1="30" x2="38" y2="30" />
          <circle cx="24" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="24" cy="24" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="24" cy="36" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'bed':
      return (
        <svg {...common}>
          <path d="M6 26h36v12H6z" />
          <path d="M6 26v-8a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v8" />
          <rect x="10" y="18" width="10" height="6" rx="1" />
          <line x1="6" y1="38" x2="6" y2="42" />
          <line x1="42" y1="38" x2="42" y2="42" />
        </svg>
      );
    case 'chair':
    default:
      return (
        <svg {...common}>
          <path d="M14 8h20v18H14z" />
          <path d="M14 26v14M34 26v14" />
          <path d="M10 40h6M32 40h6" />
        </svg>
      );
  }
}

function FeatureIcon({ kind }: { kind: 'shipping' | 'price' | 'returns' | 'quality' }) {
  const common = { viewBox: '0 0 48 48', width: 30, height: 30, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 };
  switch (kind) {
    case 'shipping':
      return (
        <svg {...common}>
          <rect x="4" y="14" width="24" height="16" rx="1" />
          <path d="M28 20h9l6 6v4h-15z" />
          <circle cx="13" cy="34" r="3" />
          <circle cx="35" cy="34" r="3" />
        </svg>
      );
    case 'price':
      return (
        <svg {...common}>
          <path d="M24 6 6 24l14 14 18-18V6z" />
          <circle cx="18.5" cy="13.5" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'returns':
      return (
        <svg {...common}>
          <path d="M8 24a16 16 0 1 1 4.6 11.2" />
          <path d="M4 22l4 6 6-3" />
        </svg>
      );
    case 'quality':
    default:
      return (
        <svg {...common}>
          <path d="M24 5l5.5 11.2 12.4 1.8-9 8.7 2.1 12.3L24 33.2 13 39l2.1-12.3-9-8.7 12.4-1.8z" />
        </svg>
      );
  }
}

const PRODUCT_PLACEHOLDER_TONES = ['fn-swatch--terracotta', 'fn-swatch--sage', 'fn-swatch--blue', 'fn-swatch--sand'];

function ProductCard({ name, price, kind, tone, badge }: { name: string; price: string; kind: IconKind; tone: number; badge?: string }) {
  return (
    <div className="fn-product-card">
      <div className={`fn-product-card__image ${PRODUCT_PLACEHOLDER_TONES[tone % PRODUCT_PLACEHOLDER_TONES.length]}`}>
        {badge ? <span className="fn-badge">{badge}</span> : null}
        <FurnitureIcon kind={kind} />
      </div>
      <div className="fn-product-card__body">
        <span className="fn-product-card__name">{name}</span>
        <span className="fn-product-card__price">{price}</span>
      </div>
    </div>
  );
}

const FEATURED_COLLECTIONS: { name: string; price: string; kind: IconKind; badge?: string }[] = [
  { name: 'Leisure Chair Set', price: '$249.00', kind: 'chair', badge: 'New' },
  { name: 'Hanging Egg Chair', price: '$389.00', kind: 'chair' },
  { name: 'Round Coffee Table', price: '$179.00', kind: 'table' },
  { name: 'Rattan Side Table', price: '$129.00', kind: 'table' },
  { name: 'Classic Sofa Set', price: '$899.00', kind: 'sofa', badge: 'Sale' },
  { name: 'Walnut Floor Lamp', price: '$99.00', kind: 'lamp' },
];

const BEST_SELLERS: { name: string; price: string; kind: IconKind; badge?: string }[] = [
  { name: 'Fency Sofa Set', price: '$749.00', kind: 'sofa' },
  { name: 'Oak Storage Cabinet', price: '$429.00', kind: 'storage' },
  { name: 'Minimal Bed Frame', price: '$599.00', kind: 'bed', badge: 'Best Seller' },
  { name: 'Studio Accent Chair', price: '$219.00', kind: 'chair' },
  { name: 'Marble Side Table', price: '$159.00', kind: 'table' },
  { name: 'Arc Reading Lamp', price: '$119.00', kind: 'lamp' },
];

const CATEGORIES: { name: string; kind: IconKind }[] = [
  { name: 'Sofas', kind: 'sofa' },
  { name: 'Chairs', kind: 'chair' },
  { name: 'Tables', kind: 'table' },
  { name: 'Storage', kind: 'storage' },
  { name: 'Lighting', kind: 'lamp' },
  { name: 'Beds', kind: 'bed' },
];

export default function Index({ theme }: { theme: any }) {
  const site = theme.site();
  const extraBlocks = theme.blocks();

  return (
    <>
      {/* ---- Hero: "Unique & Stylish Furniture" ---- */}
      <section className="fn-hero">
        <div className="fn-container fn-hero__inner">
          <div className="fn-hero__copy">
            <span className="fn-eyebrow">Modern &amp; Fancy Furniture</span>
            <h1>
              Unique &amp; <em>Stylish</em> Furniture
            </h1>
            <p>
              Timeless pieces crafted for comfort and character. Discover {site.name || 'Farnic'}&rsquo;s curated
              collection of classic and elegant furniture for every room.
            </p>
            <div className="fn-hero__actions">
              <a href="/shop" className="fn-btn fn-btn--primary">
                Shop Now
              </a>
              <a href="/categories" className="fn-btn fn-btn--outline">
                View Collection
              </a>
            </div>
          </div>
          <div className="fn-hero__visual">
            <div className="fn-swatch fn-swatch--sand fn-hero__visual-panel">
              <FurnitureIcon kind="chair" />
            </div>
            <div className="fn-hero__floating-card">
              <div className="fn-swatch fn-swatch--terracotta fn-hero__floating-thumb">
                <FurnitureIcon kind="chair" />
              </div>
              <div>
                <span className="fn-hero__floating-name">Leisure Chair Set</span>
                <span className="fn-hero__floating-price">$249.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Banner: "Classic & Elegant Furniture" (dark) ---- */}
      <section className="fn-banner fn-banner--dark">
        <div className="fn-container fn-banner__inner">
          <div className="fn-swatch fn-swatch--blue fn-banner__visual">
            <FurnitureIcon kind="sofa" />
          </div>
          <div className="fn-banner__copy">
            <span className="fn-eyebrow fn-eyebrow--light">Since day one</span>
            <h2>Classic &amp; Elegant Furniture</h2>
            <p>Hand-finished frames, premium upholstery, and a silhouette that never goes out of style.</p>
            <a href="/shop" className="fn-btn fn-btn--light">
              Explore Now
            </a>
          </div>
        </div>
      </section>

      {/* ---- Featured Collections ---- */}
      <section className="fn-section">
        <div className="fn-container">
          <div className="fn-section__heading">
            <span className="fn-eyebrow">Handpicked for you</span>
            <h2>Featured Collections</h2>
          </div>
          <div className="fn-product-grid">
            {FEATURED_COLLECTIONS.map((p, i) => (
              <ProductCard key={p.name} name={p.name} price={p.price} kind={p.kind} tone={i} badge={p.badge} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- Choose Your Category ---- */}
      <section className="fn-section fn-section--muted">
        <div className="fn-container">
          <div className="fn-section__heading fn-section__heading--center">
            <span className="fn-eyebrow">Browse by room</span>
            <h2>Choose Your Category</h2>
          </div>
          <div className="fn-category-grid">
            {CATEGORIES.map((c) => (
              <a key={c.name} href={`/categories/${c.name.toLowerCase()}`} className="fn-category-card">
                <span className="fn-category-card__icon">
                  <FurnitureIcon kind={c.kind} />
                </span>
                <span>{c.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Banner: "Modern & Fancy Furniture" (dark, reversed) w/ stats ---- */}
      <section className="fn-banner fn-banner--dark fn-banner--reverse">
        <div className="fn-container fn-banner__inner">
          <div className="fn-banner__copy">
            <span className="fn-eyebrow fn-eyebrow--light">Trusted craftsmanship</span>
            <h2>Modern &amp; Fancy Furniture</h2>
            <p>From concept to living room — furniture designed to make every space feel effortlessly modern.</p>
            <div className="fn-stat-row">
              <div className="fn-stat">
                <strong>35+</strong>
                <span>Years Experience</span>
              </div>
              <div className="fn-stat">
                <strong>2000+</strong>
                <span>Happy Clients</span>
              </div>
            </div>
          </div>
          <div className="fn-swatch fn-swatch--blue fn-banner__visual">
            <FurnitureIcon kind="sofa" />
          </div>
        </div>
      </section>

      {/* ---- Best Sellers ---- */}
      <section className="fn-section">
        <div className="fn-container">
          <div className="fn-section__heading">
            <span className="fn-eyebrow">Customer favorites</span>
            <h2>Best Sellers</h2>
          </div>
          <div className="fn-product-grid">
            {BEST_SELLERS.map((p, i) => (
              <ProductCard key={p.name} name={p.name} price={p.price} kind={p.kind} tone={i + 1} badge={p.badge} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- Why We Are The Best ---- */}
      <section className="fn-section fn-section--muted">
        <div className="fn-container">
          <div className="fn-section__heading fn-section__heading--center">
            <span className="fn-eyebrow">Why choose us</span>
            <h2>Why We Are The Best</h2>
          </div>
          <div className="fn-feature-grid">
            <div className="fn-feature">
              <FeatureIcon kind="shipping" />
              <h4>Free Shipping</h4>
              <p>Free delivery on every order, no minimum spend required.</p>
            </div>
            <div className="fn-feature">
              <FeatureIcon kind="price" />
              <h4>Best Price</h4>
              <p>Direct-from-workshop pricing with no middleman markup.</p>
            </div>
            <div className="fn-feature">
              <FeatureIcon kind="returns" />
              <h4>Easy Returns</h4>
              <p>30-day hassle-free returns on all furniture pieces.</p>
            </div>
            <div className="fn-feature">
              <FeatureIcon kind="quality" />
              <h4>Premium Quality</h4>
              <p>Solid wood frames and durable, ethically-sourced materials.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Newsletter CTA ---- */}
      <section className="fn-newsletter">
        <div className="fn-container fn-newsletter__inner">
          <h2>Get 10% Off Your First Order</h2>
          <p>Join the {site.name || 'Farnic'} list for new collections, offers, and interior inspiration.</p>
          <form className="fn-newsletter__form">
            <input type="email" placeholder="Your email address" aria-label="Email address" />
            <button type="submit" className="fn-btn fn-btn--primary">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* ---- Page-authored blocks, if any, render below the theme's own design ---- */}
      {extraBlocks && extraBlocks.length > 0 ? (
        <section className="fn-section fn-page-blocks">
          <div className="fn-container">{extraBlocks}</div>
        </section>
      ) : null}
    </>
  );
}
