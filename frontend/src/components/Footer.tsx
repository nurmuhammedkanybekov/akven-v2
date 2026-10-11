import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { OimoBand } from "../brand/Ornaments";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";
import { ContactIcon, contactValue } from "./Contacts";

/** Deep navy, opened by the oimo band. Contacts and the stall come from the owners' admin, not from the code. */
export function Footer() {
  const { t } = useT();
  const info = useShopInfo();
  const point = info?.pickupPoints[0];
  const year = new Date().getFullYear();
  return (
    <footer className="av-footer">
      <OimoBand className="av-footer__band" />
      <div className="av-container">
        <div className="av-footer__top">
          <Logo variant="stacked" height={150} className="av-footer__logo" />
          <p className="av-footer__line">{t("foot.line")}</p>
        </div>
        <div className="av-footer__grid">
          <nav className="av-footer__col" aria-label={t("foot.shop")}>
            <span className="av-footer__head">{t("foot.shop")}</span>
            <Link to="/men">{t("nav.men")}</Link><Link to="/women">{t("nav.women")}</Link>
            <Link to="/kids">{t("nav.kids")}</Link><Link to="/bundles">{t("nav.bundles")}</Link>
            <Link to="/shop">{t("foot.all")}</Link>
          </nav>
          <nav className="av-footer__col" aria-label={t("foot.help")}>
            <span className="av-footer__head">{t("foot.help")}</span>
            <Link to="/sizes">{t("foot.sizes")}</Link><Link to="/visit#pickup">{t("foot.pickup")}</Link>
            <Link to="/visit">{t("foot.visit")}</Link><Link to="/orders">{t("foot.orders")}</Link>
          </nav>
          <nav className="av-footer__col" aria-label={t("foot.business")}>
            <span className="av-footer__head">{t("foot.business")}</span>
            <Link to="/wholesale">{t("foot.wholesale")}</Link><Link to="/wholesale#gifts">{t("foot.gifts")}</Link>
            <Link to="/saved">{t("nav.savedTitle")}</Link>
          </nav>
          <div className="av-footer__col">
            <span className="av-footer__head">{t("foot.follow")}</span>
            {(info?.contacts ?? []).map((c) => (
              <a key={c.id} className="av-footer__contact" href={c.url} target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                <ContactIcon kind={c.kind} /><span>{contactValue(c)}</span>
              </a>
            ))}
            {point && (
              <address className="av-footer__address">
                {[point.market, point.section, point.passage && `${t("visit.passage")} ${point.passage}`, `${t("visit.container")} ${point.container}`, point.city]
                  .filter(Boolean).join(", ")}
              </address>
            )}
          </div>
        </div>
        <div className="av-footer__legal">
          <span>© {year} AKVEN · {t("foot.since")}</span>
          <span>{t("foot.legal")}</span>
        </div>
      </div>
    </footer>
  );
}
