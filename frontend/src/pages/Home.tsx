import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { listProducts } from "../api/endpoints";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/Alert";
import { useAsync } from "../hooks/useAsync";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_PATH } from "../lib/labels";

const BLURB: Record<string, string> = {
  MEN: "Crew to knee-high, from the office to the pitch.",
  WOMEN: "Soft cotton, bamboo and wool, cut to fit.",
  KIDS: "Tough enough for the playground.",
  BUNDLES: "Take more, pay less. The bazaar way.",
};

export function HomePage() {
  const featured = useAsync((signal) => listProducts({ pageSize: 4, sort: "newest", inStock: true }, signal), []);
  return (
    <>
      <section className="av-hero">
        <div className="av-container av-hero__inner">
          <span className="av-eyebrow" style={{ color: "var(--accent)" }}>Korean-made · Sold in Bishkek · Open to a haggle</span>
          <h1 className="av-display av-hero__title">Socks,<br />fairly priced.</h1>
          <p className="av-lead" style={{ color: "var(--on-black-2)" }}>
            Our own label, knitted in Korea. Pick a pair, and if you are buying more, ask for a better price
            the way you would at the bazaar.
          </p>
          <div className="av-row">
            <Button to="/shop" variant="accent" size="lg">Shop all socks</Button>
            <Button to="/bundles" variant="secondary" size="lg" style={{ color: "var(--on-black)", borderColor: "var(--on-black)" }}>See bundles</Button>
          </div>
        </div>
        <div className="av-hero__mark" aria-hidden="true"><Logo variant="mark" metallic height="100%" /></div>
      </section>

      <section className="av-section" style={{ borderTop: 0 }}>
        <div className="av-container">
          <header><span className="av-eyebrow">Browse</span><h2>Find your pair</h2></header>
          <div className="av-tiles">
            {CATEGORIES.map((c) => (
              <Link key={c} to={CATEGORY_PATH[c]} className="av-tile">
                <span className="av-tile__name">{CATEGORY_LABEL[c]}</span>
                <span className="av-small">{BLURB[c]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="av-section">
        <div className="av-container">
          <header><span className="av-eyebrow">New in</span><h2>Fresh on the shelf</h2></header>
          {featured.loading && <div className="av-grid-products">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} />)}</div>}
          {featured.error && <p className="av-small">We could not load the shelf right now. Please try again in a moment.</p>}
          {featured.data && featured.data.items.length === 0 && <p className="av-lead">New socks are on their way. Check back soon.</p>}
          {featured.data && featured.data.items.length > 0 && (
            <div className="av-grid-products">
              {featured.data.items.map((p) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
