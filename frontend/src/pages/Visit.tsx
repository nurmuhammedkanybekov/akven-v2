import { useState } from "react";
import { Button } from "../components/Button";
import { ClockIcon, CopyIcon, PinIcon, TruckIcon } from "../components/icons";
import { OpenNow } from "../components/OpenNow";
import { useT } from "../i18n/I18n";
import { EVERY_DAY, bishkekNow, isOpenOn, shortTime, weekdayNames } from "../lib/hours";
import { RouteMap } from "../shop/home/RouteMap";
import { useShopInfo } from "../shop/useShopInfo";

/**
 * Dordoi is huge, so this page answers three questions well: is the stall open, where exactly is it, and how do I get
 * there. Everything (address, hours, contacts) comes from the owners' admin, so it stays right without a code change.
 */
export function VisitPage() {
  const { t, lang } = useT();
  const info = useShopInfo();
  const point = info?.pickupPoints[0];
  const whatsapp = info?.contacts.find((c) => c.kind === "WHATSAPP");
  const [copied, setCopied] = useState(false);

  const address = point ? [point.market, point.section, point.passage && `${t("visit.passage")} ${point.passage}`,
    `${t("visit.container")} ${point.container}`, point.city].filter(Boolean).join(", ") : "";
  const mapsQuery = encodeURIComponent(point ? `${point.market} ${point.section ?? ""} ${point.city}` : "Dordoi Bazaar Bishkek");

  async function copy() {
    try { await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* not allowed: nothing to do */ }
  }

  return (
    <div className="av-page av-visitpage">
      <section className="av-visit-hero">
        <div className="av-container av-visit-hero__inner">
          <div className="av-stack">
            <span className="av-eyebrow">{t("visit.eyebrow")}</span>
            <h1>{t("visit.title")}</h1>
            <p className="av-lead">{t("visit.lead")}</p>
            {point && <OpenNow point={point} />}
            <div className="av-row">
              <Button href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} variant="accent" target="_blank" rel="noopener noreferrer">{t("visit.gmaps")}</Button>
              <Button href={`https://2gis.kg/bishkek/search/${encodeURIComponent("Дордой")}`} variant="secondary" className="av-btn--onnavy" target="_blank" rel="noopener noreferrer">{t("visit.twoGis")}</Button>
              {whatsapp && <Button href={whatsapp.url} variant="secondary" className="av-btn--onnavy" target="_blank" rel="noopener noreferrer">{t("visit.askWay")}</Button>}
            </div>
          </div>
          {point && (
            <figure className="av-plate" aria-hidden="true">
              <span className="av-plate__market">{point.section ?? point.market}</span>
              <span className="av-plate__passage">{t("visit.passage")} {point.passage}</span>
              <strong className="av-plate__number">{point.container}</strong>
              <span className="av-plate__brand">AK&VEN</span>
            </figure>
          )}
        </div>
      </section>

      <section className="av-container av-block av-visit-cards">
        <article className="av-visit-card" aria-labelledby="addr-h">
          <header><PinIcon /><h2 id="addr-h">{t("visit.addressTitle")}</h2></header>
          {point ? (
            <>
              <ol className="av-trail">
                <li><span>{t("visit.market")}</span><strong>{point.market}</strong></li>
                {point.section && <li><span>{t("visit.part")}</span><strong>{point.section}</strong></li>}
                {point.passage && <li><span>{t("visit.passageLabel")}</span><strong>{point.passage}</strong></li>}
                <li className="av-trail__end"><span>{t("visit.containerLabel")}</span><strong>{point.container}</strong></li>
              </ol>
              <p className="av-small av-muted">{point.city}{point.directions ? ` · ${point.directions}` : ""}</p>
              <div className="av-row">
                <Button variant="secondary" size="sm" onClick={copy}><CopyIcon /> {copied ? t("visit.copied") : t("visit.copy")}</Button>
              </div>
            </>
          ) : <p className="av-small">…</p>}
        </article>

        <article className="av-visit-card" aria-labelledby="hours-h">
          <header><ClockIcon /><h2 id="hours-h">{t("visit.hours")}</h2></header>
          {point?.opensAt && point.closesAt ? (
            <>
              {point.openDays === EVERY_DAY && (
                <p className="av-visit-card__big">{t("hours.everyDay")} <strong>{shortTime(point.opensAt)}–{shortTime(point.closesAt)}</strong></p>
              )}
              <ul className="av-week">
                {weekdayNames(lang).map((name, d) => {
                  const today = bishkekNow(new Date()).day === d;
                  return (
                    <li key={d} className={today ? "is-today" : undefined} aria-current={today ? "date" : undefined}>
                      <span>{name}{today && <em> · {t("hours.today")}</em>}</span>
                      <span>{isOpenOn(point.openDays, d) ? `${shortTime(point.opensAt!)}–${shortTime(point.closesAt!)}` : t("hours.closedDay")}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="av-small av-muted">{t("hours.tz")}{point.hours ? ` · ${point.hours}` : ""}</p>
            </>
          ) : <p>{point?.hours ?? t("visit.hoursSoon")}</p>}
        </article>
      </section>

      <RouteMap onVisitPage />

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
    </div>
  );
}
