import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { LanguageSwitch, useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

const NAV: Array<{ to: string; key: MessageKey }> = [
  { to: "/men", key: "nav.men" },
  { to: "/women", key: "nav.women" },
  { to: "/kids", key: "nav.kids" },
  { to: "/bundles", key: "nav.bundles" },
  { to: "/wholesale", key: "nav.wholesale" },
  { to: "/visit", key: "nav.visit" },
];

interface HeaderProps {
  cartCount?: number;
  /** Where the person icon leads: the login page for visitors, the admin for staff. */
  accountTo?: string;
  accountLabel?: string;
  extra?: ReactNode;
}

export function Header({ cartCount = 0, accountTo = "/login", accountLabel, extra }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <>
      <div className="av-ann">
        <div className="av-container av-ann__bar">
          <p className="av-ann__text"><span className="av-ann__long">{t("ann.text")}</span><span className="av-ann__short">{t("ann.short")}</span></p>
          <LanguageSwitch className="av-ann__langs" />
        </div>
      </div>
      <header className="av-header">
        <div className="av-container">
          <div className="av-header__bar">
            <button type="button" className="av-icon-btn av-menu-btn" aria-expanded={open} aria-controls="mobile-nav"
                    aria-label={open ? t("nav.close") : t("nav.open")} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
            <Link to="/" className="av-header__logo" aria-label="Ak&Ven home"><Logo height={22} /></Link>
            <nav className="av-nav" aria-label={t("nav.main")}>
              {NAV.map((n) => <NavLink key={n.to} to={n.to}>{t(n.key)}</NavLink>)}
            </nav>
            <div className="av-header__actions">
              {extra}
              <Link className="av-icon-btn" to="/shop" aria-label={t("nav.search")}><SearchIcon /></Link>
              <Link className="av-icon-btn" to={accountTo} aria-label={accountLabel ?? t("nav.signin")}><UserIcon /></Link>
              <Link className="av-icon-btn" to="/cart" aria-label={t("nav.bag", { n: cartCount })}>
                <BagIcon />
                {cartCount > 0 && <span className="av-icon-btn__count" aria-hidden="true">{cartCount}</span>}
              </Link>
            </div>
          </div>
          {open && (
            <nav id="mobile-nav" className="av-mobile-nav" aria-label={t("nav.main")}>
              {NAV.map((n) => <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}>{t(n.key)}</NavLink>)}
              <LanguageSwitch className="av-mobile-nav__langs" />
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
