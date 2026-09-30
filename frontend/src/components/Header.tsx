import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

const NAV = [
  { to: "/men", label: "Men" },
  { to: "/women", label: "Women" },
  { to: "/kids", label: "Kids" },
  { to: "/bundles", label: "Bundles" },
];

interface HeaderProps {
  cartCount?: number;
  /** Where the person icon leads: the login page for visitors, the admin for staff. */
  accountTo?: string;
  accountLabel?: string;
  extra?: ReactNode;
}

export function Header({ cartCount = 0, accountTo = "/login", accountLabel = "Sign in", extra }: HeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="av-header">
      <div className="av-container">
        <div className="av-header__bar">
          <Link to="/" aria-label="Ak&Ven home"><Logo height={22} /></Link>
          <nav className="av-nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
          </nav>
          <div className="av-header__actions">
            {extra}
            <Link className="av-icon-btn" to="/shop" aria-label="Browse and search"><SearchIcon /></Link>
            <Link className="av-icon-btn" to={accountTo} aria-label={accountLabel}><UserIcon /></Link>
            <Link className="av-icon-btn" to="/cart" aria-label={`Bag, ${cartCount} items`}>
              <BagIcon />
              {cartCount > 0 && <span className="av-icon-btn__count" aria-hidden="true">{cartCount}</span>}
            </Link>
            <button type="button" className="av-icon-btn av-menu-btn" aria-expanded={open} aria-controls="mobile-nav"
                    aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="av-mobile-nav" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</NavLink>)}
          </nav>
        )}
      </div>
    </header>
  );
}
