import { Logo } from "../brand/Logo";

export function Footer() {
  return (
    <footer className="av-footer">
      <div className="av-container av-footer__grid">
        <div className="av-stack">
          <Logo height={26} />
          <p className="av-small">Korean-made socks under our own label. Sold in Bishkek, now online, and open to a little haggling.</p>
        </div>
        <nav className="av-stack" aria-label="Shop">
          <span className="av-eyebrow">Shop</span>
          <a href="/men">Men</a><a href="/women">Women</a><a href="/kids">Kids</a><a href="/bundles">Bundles</a>
        </nav>
        <nav className="av-stack" aria-label="Help">
          <span className="av-eyebrow">Help</span>
          <a href="/orders">My orders</a><a href="/negotiate">How haggling works</a>
        </nav>
      </div>
    </footer>
  );
}
