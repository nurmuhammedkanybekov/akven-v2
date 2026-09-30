import { useState, type ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

const NAV = [
  { href: "/men", label: "Men" },
  { href: "/women", label: "Women" },
  { href: "/kids", label: "Kids" },
  { href: "/bundles", label: "Bundles" },
];

export function Header({ cartCount = 0, current, extra }: { cartCount?: number; current?: string; extra?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="av-header">
      <div className="av-container">
        <div className="av-header__bar">
          <a href="/" aria-label="Ak&Ven home"><Logo height={22} /></a>
          <nav className="av-nav" aria-label="Main">
            {NAV.map((n) => <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</a>)}
          </nav>
          <div className="av-header__actions">
            {extra}
            <a className="av-icon-btn" href="/search" aria-label="Search"><SearchIcon /></a>
            <a className="av-icon-btn" href="/account" aria-label="Account"><UserIcon /></a>
            <a className="av-icon-btn" href="/cart" aria-label={`Cart, ${cartCount} items`}>
              <BagIcon />
              {cartCount > 0 && <span className="av-icon-btn__count" aria-hidden="true">{cartCount}</span>}
            </a>
            <button type="button" className="av-icon-btn av-menu-btn" aria-expanded={open} aria-controls="mobile-nav"
                    aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="av-mobile-nav" aria-label="Main">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
        )}
      </div>
    </header>
  );
}
