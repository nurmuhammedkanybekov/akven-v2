import { useT } from "../i18n/I18n";
import { Button } from "../components/Button";
import { PinIcon, StoreIcon, TruckIcon } from "../components/icons";
import { useShopInfo } from "../shop/useShopInfo";

/**
 * Dordoi is huge, so this page answers one question well: how do I find the stall? Everything shown (address,
 * hours, contacts) comes from the owners' admin, so it stays correct without a code change.
 */
export function VisitPage() {
  const { t } = useT();
  const info = useShopInfo();
  const point = info?.pickupPoints[0];
  const mapQuery = point ? encodeURIComponent(`${point.market} ${point.section ?? ""} ${point.city}`) : "";

  return (
    <div className="av-page">
      <section className="av-container av-visit">
        <header className="av-stack">
          <span className="av-eyebrow">{t("visit.eyebrow")}</span>
          <h1>{t("visit.title")}</h1>
          <p className="av-lead">{t("visit.lead")}</p>
        </header>

        <div className="av-deep av-visit__card">
          <div className="av-stack">
            <span className="av-eyebrow">{t("visit.where")}</span>
            {point ? (
              <address className="av-visit__address">
                <strong>{point.market}</strong>
                {point.section && <span>{point.section}</span>}
                {point.passage && <span>{t("visit.passage")} {point.passage}</span>}
                <span className="av-visit__container">{t("visit.container")} {point.container}</span>
                <span>{point.city}</span>
              </address>
            ) : <p>…</p>}
            <span className="av-eyebrow">{t("visit.hours")}</span>
            <p>{point?.hours ?? t("visit.hoursSoon")}</p>
            {point && (
              <div className="av-row">
                <Button href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} variant="accent" target="_blank" rel="noopener noreferrer">{t("visit.map")}</Button>
              </div>
            )}
          </div>
          <ol className="av-visit__steps">
            <li><StoreIcon /><span>{t("visit.how1")}</span></li>
            <li><PinIcon /><span>{t("visit.how2", { passage: point?.passage ?? "8" })}</span></li>
            <li><StoreIcon /><span>{t("visit.how3", { container: point?.container ?? "70-E" })}</span></li>
          </ol>
          {point?.directions && <p className="av-visit__directions">{point.directions}</p>}
        </div>
      </section>

      <section id="pickup" className="av-container av-block av-visit__grid">
        <div className="av-stack">
          <span className="av-eyebrow">{t("visit.pickupTitle")}</span>
          <ol className="av-numbered">
            <li><b>1</b><span>{t("visit.pickup1")}</span></li>
            <li><b>2</b><span>{t("visit.pickup2")}</span></li>
            <li><b>3</b><span>{t("visit.pickup3")}</span></li>
          </ol>
        </div>
        <div className="av-stack">
          <span className="av-eyebrow">{t("visit.deliveryTitle")}</span>
          <p className="av-visit__delivery"><TruckIcon /><span>{t("visit.delivery")}</span></p>
        </div>
      </section>

      <section id="contact" className="av-container av-block">
        <div className="av-stack">
          <span className="av-eyebrow">{t("visit.contactTitle")}</span>
          <h2>{t("visit.contactLead")}</h2>
          {info && info.contacts.length === 0 && <p className="av-small">{t("visit.noContacts")}</p>}
          <ul className="av-contacts">
            {info?.contacts.map((c) => (
              <li key={c.id}>
                <a href={c.url} target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                  <span className="av-eyebrow">{c.label ?? c.kind}</span>
                  <strong>{c.kind === "INSTAGRAM" || c.kind === "TELEGRAM" ? `@${c.value}` : c.value}</strong>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
