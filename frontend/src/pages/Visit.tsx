import { useState } from "react";
import { Button } from "../components/Button";
import { ClockIcon, CopyIcon, PinIcon, TruckIcon } from "../components/icons";
import { OpenNow } from "../components/OpenNow";
import { useT } from "../i18n/I18n";
import { EVERY_DAY, bishkekNow, isOpenOn, shortTime, weekdayNames } from "../lib/hours";
import { RouteMap } from "../shop/home/RouteMap";
import { useShopInfo } from "../shop/useShopInfo";
import { getDeliveryZones } from "../api/endpoints";
import { useAsync } from "../hooks/useAsync";
import { useMoney } from "../shop/useMoney";
import type { MessageKey } from "../i18n/en";

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
  const zones = useAsync((signal) => getDeliveryZones(signal), []);
  const { money } = useMoney();

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
              <ul className="av-week av-week--tags">
                {weekdayNames(lang, "short").map((name, d) => {
                  const today = bishkekNow(new Date()).day === d;
                  return (
                    <li key={d} className={today ? "is-today" : undefined} aria-current={today ? "date" : undefined}>
                      <span>{name}{today && <em>{t("hours.today")}</em>}</span>
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

      <section id="pickup" className="av-visit-ways av-block" aria-labelledby="pickup-h" data-reveal>
        <div className="av-container av-visit-ways__inner">
          <div className="av-stack">
            <span className="av-hand">{t("visit.pickupTitle")}</span>
            <h2 id="pickup-h">{t("visit.pickupH")}</h2>
            <ol className="av-kraftsteps">
              {[1, 2, 3].map((n) => (
                <li key={n}><span className="av-kraft">0{n}</span><span>{t(`visit.pickup${n}` as MessageKey)}</span></li>
              ))}
            </ol>
          </div>
          <div className="av-stack">
            <span className="av-hand">{t("visit.deliveryTitle")}</span>
            <h2>{t("visit.deliveryH")}</h2>
            <p className="av-visit-ways__lead"><TruckIcon /><span>{t("visit.delivery")}</span></p>
            {zones.data && zones.data.length > 0 && (
              <ul className="av-zonelist">
                {zones.data.filter((z) => z.active).slice(0, 8).map((z) => (
                  <li key={z.id}>
                    <span className="av-zonelist__name"><strong>{z.name}</strong><span className="av-small">{z.kind === "CARGO" ? t("visit.zoneCargo") : t("visit.zoneCourier")}{z.daysMin != null && ` · ${t("visit.zoneDays", { a: z.daysMin, b: z.daysMax ?? z.daysMin })}`}</span></span>
                    <span className="av-zonelist__fee">{z.payOnReceipt ? t("visit.zoneOnReceipt") : z.fee > 0 ? money(Number(z.fee)) : t("visit.zoneFree")}
                      {z.freeFrom != null && z.fee > 0 && <span className="av-small">{t("visit.zoneFreeFrom", { amount: money(Number(z.freeFrom)) })}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
