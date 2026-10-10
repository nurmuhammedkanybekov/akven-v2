import { HornDivider } from "../brand/Ornaments";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { Button } from "../components/Button";
import { SealIcon } from "../components/icons";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BazaarCalculator } from "../shop/home/BazaarCalculator";
import { BoxBuilder } from "../shop/home/BoxBuilder";
import { ContainerHero } from "../shop/home/ContainerHero";
import { GiftCalendar } from "../shop/home/GiftCalendar";
import { HeightRuler } from "../shop/home/HeightRuler";
import { Marquee } from "../shop/home/Marquee";
import { RouteMap } from "../shop/home/RouteMap";
import { Shelf } from "../shop/home/Shelf";
import { usePricing, useShopInfo } from "../shop/useShopInfo";

/** A family's worth of socks, for the story until the family's own photo replaces it. */
const FAMILY: SockSpec[] = [
  { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
  { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
];

/**
 * The home page, built around the family's real stall: container 70-E at Dordoi. Each section shows one thing the
 * shop does differently: a fitting for sock heights, a box that shows the collection price, the bazaar calculator
 * for "ask for your price", the gift calendar, and the way to the stall.
 */
export function HomePage() {
  const { t } = useT();
  const pricing = usePricing();
  const info = useShopInfo();
  const min = pricing?.minOrderPairs ?? 1;
  const writeTo = info?.contacts.filter((c) => c.kind === "TELEGRAM" || c.kind === "WHATSAPP" || c.kind === "INSTAGRAM") ?? [];

  return (
    <>
      <ContainerHero minPairs={min} />
      <Marquee />
      <Shelf />
      <HeightRuler />
      <BoxBuilder minPairs={min} tiers={pricing?.tiers ?? []} />
      <BazaarCalculator />
      <GiftCalendar />

      {/* ---- quality: the certificate ---- */}
      <section className="av-block" aria-labelledby="quality-title" data-reveal>
        <div className="av-container">
          <div className="av-deep av-quality">
            <div className="av-quality__photo">
              <div className="av-cert" aria-hidden="true">
                <SealIcon /><i /><i className="s" /><i /><i /><i className="s" />
              </div>
              <span className="av-photonote">{t("quality.photo")}</span>
            </div>
            <div className="av-stack">
              <span className="av-eyebrow av-orn">{t("quality.eyebrow")}</span>
              <h2 id="quality-title">{t("quality.title")}</h2>
              <p>{t("quality.lead")}</p>
              <dl className="av-facts">
                {(["factory", "cert", "issued", "materials"] as const).map((k) => (
                  <div key={k}><dt>{t(`quality.${k}` as MessageKey)}</dt><dd className="av-placeholder">{t(`quality.${k}V` as MessageKey)}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ---- the family's story ---- */}
      <div className="av-container"><HornDivider /></div>
      <section className="av-block av-block--tight" aria-labelledby="story-title" data-reveal>
        <div className="av-container av-story">
          <div className="av-story__photo" style={{ background: "var(--tint-1)" }}>
            <div className="av-story__socks" aria-hidden="true">
              {FAMILY.map((s, i) => <SockArt key={i} {...s} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} />)}
            </div>
            <span className="av-photonote">{t("story.photo")}</span>
          </div>
          <div className="av-stack">
            <span className="av-eyebrow av-orn">{t("story.eyebrow")}</span>
            <h2 id="story-title">{t("story.title")}</h2>
            <p className="av-lead">{t("story.lead")}</p>
            <dl className="av-facts av-facts--light">
              <div><dt>{t("story.started")}</dt><dd className="av-placeholder">{t("story.startedV")}</dd></div>
              <div><dt>{t("story.made")}</dt><dd>{t("story.madeV")}</dd></div>
              <div><dt>{t("story.sold")}</dt><dd>{t("story.soldV")}</dd></div>
              <div><dt>{t("story.run")}</dt><dd>{t("story.runV")}</dd></div>
            </dl>
            <div className="av-row"><Button to="/visit" variant="secondary">{t("story.cta")}</Button></div>
          </div>
        </div>
      </section>

      <RouteMap />

      {/* ---- wholesale ---- */}
      <section id="wholesale" className="av-block" aria-labelledby="whole-title" data-reveal>
        <div className="av-container av-whole">
          <div className="av-stack">
            <span className="av-eyebrow av-orn">{t("whole.eyebrow")}</span>
            <h2 id="whole-title">{t("whole.title")}</h2>
            <p className="av-lead">{t("whole.lead")}</p>
          </div>
          <div className="av-whole__actions">
            <Button to="/wholesale" size="lg">{t("whole.cta")}</Button>
            {writeTo.map((c) => (
              <Button key={c.id} href={c.url} variant="secondary" target="_blank" rel="noopener noreferrer">{c.label ?? c.kind}</Button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
