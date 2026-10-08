import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { HornMark, OimoBand } from "../brand/Ornaments";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";

/** Deep navy, opened by the oimo band. Contacts and the stall come from the owners' admin, not from the code. */
export function Footer() {
  const { t } = useT();
  const info = useShopInfo();
  const point = info?.pickupPoints[0];
  return (
    <footer className="av-footer">
      <OimoBand className="av-footer__band" />
      <div className="av-container av-footer__grid">
        <div className="av-stack">
          <Logo height={26} />
          <p className="av-footer__about">{t("foot.about")}</p>
          {point && (
            <address className="av-footer__address">
              {[point.market, point.section, point.passage && `${t("visit.passage")} ${point.passage}`, `${t("visit.container")} ${point.container}`, point.city]
                .filter(Boolean).join(", ")}
            </address>
          )}
        </div>
        <nav className="av-stack" aria-label={t("foot.shop")}>
          <span className="av-footer__head">{t("foot.shop")}</span>
          <Link to="/men">{t("nav.men")}</Link><Link to="/women">{t("nav.women")}</Link>
          <Link to="/kids">{t("nav.kids")}</Link><Link to="/bundles">{t("nav.bundles")}</Link>
          <Link to="/shop">{t("foot.all")}</Link>
        </nav>
        <nav className="av-stack" aria-label={t("foot.help")}>
          <span className="av-footer__head">{t("foot.help")}</span>
          <Link to="/visit">{t("foot.visit")}</Link><Link to="/visit#pickup">{t("foot.pickup")}</Link>
          <Link to="/sizes">{t("foot.sizes")}</Link><Link to="/wholesale">{t("foot.wholesale")}</Link>
        </nav>
        {info && info.contacts.length > 0 && (
          <nav className="av-stack" aria-label={t("foot.follow")}>
            <span className="av-footer__head">{t("foot.follow")}</span>
            {info.contacts.map((c) => (
              <a key={c.id} href={c.url} target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {c.label ?? c.kind} <span className="av-footer__value">{c.kind === "INSTAGRAM" || c.kind === "TELEGRAM" ? `@${c.value}` : c.value}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className="av-container">
        <div className="av-footer__rule"><HornMark size={36} /></div>
        <div className="av-footer__legal">
          <span>© AK&amp;VEN · {t("foot.address")}</span>
          <span>{t("foot.legal")}</span>
        </div>
      </div>
    </footer>
  );
}
