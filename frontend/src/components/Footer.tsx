import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { OimoBand } from "../brand/Ornaments";
import { LanguageSwitch, useT } from "../i18n/I18n";
import { useAuth } from "../auth/AuthContext";
import { CurrencySwitch } from "../shop/useMoney";
import { useShopInfo } from "../shop/useShopInfo";
import { ContactIcon, contactValue } from "./Contacts";
import { ArrowUpIcon, PinIcon, StackIcon, StoreIcon, TruckIcon, WalletIcon } from "./icons";
import { OpenNow } from "./OpenNow";

const PROMISES = [
  { n: 1, icon: <StoreIcon /> },
  { n: 2, icon: <TruckIcon /> },
  { n: 3, icon: <WalletIcon /> },
  { n: 4, icon: <StackIcon /> },
] as const;

/**
 * The footer answers what a visitor still wants to know at the bottom of a page: is the stall open and where is it,
 * how do pickup, delivery and payment work, where is everything else, and in which language and currency. Contacts,
 * the address and the hours come from the owners' admin, so they stay right without a code change.
 */
export function Footer() {
  const { t } = useT();
  const { session } = useAuth();
  const info = useShopInfo();
  const point = info?.pickupPoints[0];
  const year = new Date().getFullYear();
  const address = point ? [point.market, point.section, point.passage && `${t("visit.passage")} ${point.passage}`,
    `${t("visit.container")} ${point.container}`, point.city].filter(Boolean).join(", ") : null;
  const mapsQuery = encodeURIComponent(point ? `${point.market} ${point.section ?? ""} ${point.city}` : "Dordoi Bazaar Bishkek");

  return (
    <footer className="av-footer">
      <OimoBand className="av-footer__band" />
      <div className="av-container">
        <div className="av-footer__top">
          <div className="av-footer__brand">
            <Logo variant="stacked" height={120} className="av-footer__logo" write />
            <p className="av-footer__line">{t("foot.line")}</p>
            <p className="av-footer__sign">{t("foot.sign")}</p>
          </div>
          <section className="av-footer__stall" aria-label={t("foot.stall")}>
            <span className="av-footer__head">{t("foot.stall")}</span>
            {point && <OpenNow point={point} className="av-footer__open" />}
            {address && <address className="av-footer__address"><PinIcon /><span>{address}</span></address>}
            <div className="av-footer__go">
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer">{t("visit.gmaps")}</a>
              <a href={`https://2gis.kg/bishkek/search/${encodeURIComponent("Дордой")}`} target="_blank" rel="noopener noreferrer">{t("visit.twoGis")}</a>
              <Link to="/visit">{t("foot.howTo")}</Link>
            </div>
          </section>
        </div>

        <ul className="av-footer__promises">
          {PROMISES.map(({ n, icon }) => (
            <li key={n}>
              <span className="av-footer__picon">{icon}</span>
              <span><strong>{t(`foot.p${n}`)}</strong><small>{t(`foot.p${n}s`)}</small></span>
            </li>
          ))}
        </ul>

        <div className="av-footer__grid">
          <nav className="av-footer__col" aria-label={t("foot.shop")}>
            <span className="av-footer__head">{t("foot.shop")}</span>
            <Link to="/men">{t("nav.men")}</Link><Link to="/women">{t("nav.women")}</Link>
            <Link to="/kids">{t("nav.kids")}</Link><Link to="/gifts">{t("nav.gifts")}</Link>
            <Link to="/shop">{t("foot.all")}</Link>
          </nav>
          <nav className="av-footer__col" aria-label={t("foot.help")}>
            <span className="av-footer__head">{t("foot.help")}</span>
            <Link to="/sizes">{t("foot.sizes")}</Link><Link to="/finder">{t("fd.eyebrow")}</Link><Link to="/visit#pickup">{t("foot.pickup")}</Link>
            <Link to="/visit">{t("foot.visit")}</Link><Link to="/story">{t("nav.story")}</Link>
          </nav>
          <nav className="av-footer__col" aria-label={t("foot.business")}>
            <span className="av-footer__head">{t("foot.business")}</span>
            <Link to="/wholesale">{t("foot.wholesale")}</Link><Link to="/wholesale#gifts">{t("foot.gifts")}</Link>
            <Link to="/wholesale#quote">{t("quote.cta")}</Link>
          </nav>
          <nav className="av-footer__col" aria-label={t("foot.account")}>
            <span className="av-footer__head">{t("foot.account")}</span>
            <Link to={session ? "/account" : "/login"}>{session ? t("nav.account") : t("nav.signin")}</Link>
            <Link to="/orders">{t("foot.orders")}</Link><Link to="/saved">{t("nav.savedTitle")}</Link>
            <Link to="/privacy">{t("foot.privacy")}</Link>
          </nav>
          <div className="av-footer__col">
            <span className="av-footer__head">{t("foot.follow")}</span>
            {(info?.contacts ?? []).map((c) => (
              <a key={c.id} className="av-footer__contact" href={c.url} target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                <ContactIcon kind={c.kind} /><span>{contactValue(c)}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="av-footer__legal">
          <div className="av-footer__prefs" role="group" aria-label={t("foot.prefs")}>
            <LanguageSwitch />
            <CurrencySwitch />
          </div>
          <span>© {year} AK&VEN · {t("foot.since")} · <Link to="/privacy">{t("foot.privacy")}</Link></span>
          <button type="button" className="av-footer__up" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            {t("foot.top")} <ArrowUpIcon />
          </button>
          <p className="av-footer__fine">{t("foot.legal")}</p>
        </div>
      </div>
    </footer>
  );
}
