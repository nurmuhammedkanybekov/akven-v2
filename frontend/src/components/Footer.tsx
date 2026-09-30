import { Link } from "react-router-dom";
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
          <Link to="/men">Men</Link><Link to="/women">Women</Link><Link to="/kids">Kids</Link><Link to="/bundles">Bundles</Link>
        </nav>
        <nav className="av-stack" aria-label="Help">
          <span className="av-eyebrow">Shop info</span>
          <Link to="/shop">All socks</Link>
        </nav>
      </div>
    </footer>
  );
}
