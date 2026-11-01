import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { LanguageSwitch, useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, PinIcon, SearchIcon, UserIcon } from "./icons";
import { CurrencySwitch } from "../shop/useMoney";
import { SearchOverlay } from "./SearchOverlay";

const NAV: Array<{ to: string; key: MessageKey }> = [
  { to: "/shop", key: "nav.shop" },
  { to: "/men", key: "nav.men" },
  { to: "/women", key: "nav.women" },
  { to: "/kids", key: "nav.kids" },
  { to: "/gifts", key: "nav.gifts" },
  { to: "/story", key: "nav.story" },
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

/**
 * The top bar's message on one line. When it is wider than its room (a long Russian or Kyrgyz message on a phone), it
 * glides along once while it is shown, so it never wraps onto three lines or runs under the language switch.
 */
function AnnText({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const run = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const measure = () => {
      const b = box.current, r = run.current;
      if (!b || !r) return;
      const over = r.scrollWidth - b.clientWidth;
      b.classList.toggle("is-long", over > 2);
      b.style.setProperty("--shift", `${-Math.max(0, over + 24)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);
  return <p ref={box} className="av-ann__text"><span ref={run} className="av-ann__run">{text}</span></p>;
}

export function Header({ cartCount = 0, savedCount = 0, accountTo = "/login", accountLabel, extra }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang } = useT();
  const { pathname } = useLocation();
  const msg = useRotation(MESSAGES.length, 5000);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  // The menu links must never be cut off: when they do not fit beside the logo (a long language, a narrow window),
  // the header switches to the menu button instead.
  // 0: the links as designed, 1: a little tighter, 2: the menu button.
  const [fit, setFit] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const nav = navRef.current, bar = nav?.parentElement, logo = logoRef.current;
    if (!nav || !bar || !logo || typeof ResizeObserver === "undefined") return;
    let lastWidth = -1;
    const check = (force = false) => {
      if (getComputedStyle(nav).display === "none") { setFit(0); return; }
      // Only a change of width matters: the header's height changes with the menu's own size, and reacting to that
      // made the menu flip between two sizes on every frame.
      if (!force && bar.clientWidth === lastWidth) return;
      lastWidth = bar.clientWidth;
      // Measure the links at their designed size, whatever size they are shown at now: take the tighter and compact
      // styles off for the measurement and put them back before the browser paints.
      const tight = nav.classList.contains("is-tight"), compact = bar.classList.contains("is-compact");
      nav.classList.remove("is-tight"); bar.classList.remove("is-compact");
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 0;
      const links = Array.from(nav.children) as HTMLElement[];
      const full = links.reduce((w, a) => w + a.scrollWidth, 0) + gap * Math.max(0, links.length - 1);
      nav.classList.add("is-tight");
      const tgap = parseFloat(getComputedStyle(nav).columnGap) || 0;
      const tightW = links.reduce((w, a) => w + a.scrollWidth, 0) + tgap * Math.max(0, links.length - 1);
      if (!tight) nav.classList.remove("is-tight");
      if (compact) bar.classList.add("is-compact");
      const room = (bar.clientWidth - logo.offsetWidth - 2 * (parseFloat(getComputedStyle(bar).columnGap) || 0)) / 2;
      setFit(full <= room - 2 ? 0 : tightW <= room - 2 ? 1 : 2);
    };
    const ro = new ResizeObserver(() => check());
    ro.observe(bar);
    check(true);
    document.fonts?.ready.then(() => check(true)).catch(() => undefined);
    return () => ro.disconnect();
  }, [lang]);
  const [drawerTop, setDrawerTop] = useState(108);
  const [searching, setSearching] = useState(false);
  // "/" opens the search from anywhere, unless the visitor is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      setSearching(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          <AnnText key={msg} text={t(MESSAGES[msg])} />
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
          <div className={`av-header__bar${fit === 2 ? " is-compact" : ""}`}>
            <button type="button" className="av-icon-btn av-menu-btn" aria-expanded={open} aria-controls="mobile-nav"
                    aria-label={open ? t("nav.close") : t("nav.open")} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
            <nav ref={navRef} className={`av-nav${fit === 1 ? " is-tight" : ""}`} aria-label={t("nav.main")}>
              {NAV.map((n) => <NavLink key={n.to} to={n.to}>{t(n.key)}</NavLink>)}
            </nav>
            <Link ref={logoRef} to="/" className="av-header__logo" aria-label={t("nav.home")}><Logo height={38} write /></Link>
            <div className="av-header__actions">
              <NavLink className="av-header__biz" to="/wholesale">{t("nav.wholesale")}</NavLink>
              <Link className="av-icon-btn av-hide-md" to="/visit" aria-label={t("nav.visit")} title={t("nav.visit")}><PinIcon /></Link>
              <button type="button" className="av-icon-btn" aria-label={t("nav.search")} aria-keyshortcuts="/" onClick={() => setSearching(true)}><SearchIcon /></button>
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
      <SearchOverlay open={searching} onClose={() => setSearching(false)} />
      <nav id="mobile-nav" className={`av-drawer${open ? " is-open" : ""}`} style={{ top: drawerTop }} aria-label={t("nav.main")} aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        <div className="av-drawer__links">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} style={{ "--i": i } as React.CSSProperties}>{t(n.key)}</NavLink>
          ))}
          <NavLink to="/wholesale" style={{ "--i": NAV.length } as React.CSSProperties}>{t("nav.wholesale")}</NavLink>
          <NavLink to="/saved" style={{ "--i": NAV.length + 1 } as React.CSSProperties}>{t("nav.savedTitle")}</NavLink>
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
