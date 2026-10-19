import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { LanguageSwitch, useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, PinIcon, SearchIcon, UserIcon } from "./icons";
import { CurrencySwitch } from "../shop/useMoney";

const NAV: Array<{ to: string; key: MessageKey }> = [
  { to: "/men", key: "nav.men" },
  { to: "/women", key: "nav.women" },
  { to: "/kids", key: "nav.kids" },
  { to: "/bundles", key: "nav.bundles" },
  { to: "/gift", key: "nav.gift" },
  { to: "/wholesale", key: "nav.wholesale" },
];

const MESSAGES: MessageKey[] = ["ann.1", "ann.2", "ann.3"];

interface HeaderProps {
  cartCount?: number;
  savedCount?: number;
  /** Where the person icon leads: the login page for visitors, the admin for staff. */
  accountTo?: string;
  accountLabel?: string;
  extra?: ReactNode;
}

/** One short message at a time in the top bar, changing every few seconds (held still for reduced motion). */
function useRotation(count: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms]);
  return i;
}

export function Header({ cartCount = 0, savedCount = 0, accountTo = "/login", accountLabel, extra }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useT();
  const { pathname } = useLocation();
  const msg = useRotation(MESSAGES.length, 5000);
  const headerRef = useRef<HTMLElement>(null);
  const [drawerTop, setDrawerTop] = useState(108);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (open && headerRef.current) setDrawerTop(Math.max(0, headerRef.current.getBoundingClientRect().bottom));
    document.body.classList.toggle("av-locked", open);
    return () => document.body.classList.remove("av-locked");
  }, [open]);

  return (
    <>
      <div className="av-ann">
        <div className="av-container av-ann__bar">
          <p className="av-ann__text" key={msg}>{t(MESSAGES[msg])}</p>
          <div className="av-ann__langs">
            <CurrencySwitch />
            <span className="av-ann__sep" aria-hidden="true" />
            <LanguageSwitch />
            {extra && <><span className="av-ann__sep" aria-hidden="true" />{extra}</>}
          </div>
        </div>
      </div>
      <header ref={headerRef} className={`av-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="av-container">
          <div className="av-header__bar">
            <button type="button" className="av-icon-btn av-menu-btn" aria-expanded={open} aria-controls="mobile-nav"
                    aria-label={open ? t("nav.close") : t("nav.open")} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
            <nav className="av-nav" aria-label={t("nav.main")}>
              {NAV.map((n) => <NavLink key={n.to} to={n.to}>{t(n.key)}</NavLink>)}
            </nav>
            <Link to="/" className="av-header__logo" aria-label={t("nav.home")}><Logo height={32} /></Link>
            <div className="av-header__actions">
              <Link className="av-icon-btn av-hide-md" to="/visit" aria-label={t("nav.visit")} title={t("nav.visit")}><PinIcon /></Link>
              <Link className="av-icon-btn" to="/shop" aria-label={t("nav.search")}><SearchIcon /></Link>
              <Link className="av-icon-btn av-hide-md" to="/saved" aria-label={t("nav.saved", { n: savedCount })}>
                <HeartIcon />
                {savedCount > 0 && <span key={savedCount} className="av-icon-btn__count" aria-hidden="true">{savedCount}</span>}
              </Link>
              <Link className="av-icon-btn" to={accountTo} aria-label={accountLabel ?? t("nav.signin")}><UserIcon /></Link>
              <Link className="av-icon-btn" to="/cart" aria-label={t("nav.bag", { n: cartCount })} data-bag-target=""
                    onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("is-bump"); }}>
                <BagIcon />
                {cartCount > 0 && <span key={cartCount} className="av-icon-btn__count" aria-hidden="true">{cartCount}</span>}
              </Link>
            </div>
          </div>
        </div>
      </header>
      <nav id="mobile-nav" className={`av-drawer${open ? " is-open" : ""}`} style={{ top: drawerTop }} aria-label={t("nav.main")} aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        <div className="av-drawer__links">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} style={{ "--i": i } as React.CSSProperties}>{t(n.key)}</NavLink>
          ))}
          <NavLink to="/saved" style={{ "--i": NAV.length } as React.CSSProperties}>{t("nav.savedTitle")}</NavLink>
        </div>
        <div className="av-mobile-nav__langs">
          <LanguageSwitch />
          <CurrencySwitch />
          {extra}
        </div>
      </nav>
    </>
  );
}
