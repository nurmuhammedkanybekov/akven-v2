import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18n";
import { BazaarCalculator } from "../shop/home/BazaarCalculator";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { Clothesline } from "../shop/home/Clothesline";
import { Facts } from "../shop/home/Facts";
import { FamilyPlanner } from "../shop/home/FamilyPlanner";
import { ForBusiness } from "../shop/home/ForBusiness";
import { GiftCalendar } from "../shop/home/GiftCalendar";
import { HeroCalculator } from "../shop/home/HeroCalculator";
import { RouteMap } from "../shop/home/RouteMap";
import { Shelf } from "../shop/home/Shelf";
import { usePricing } from "../shop/useShopInfo";

/** A family's worth of socks, one for each of them, for the story. */
const FAMILY: SockSpec[] = [
  { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
  { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
];

/**
 * The home page, in the order a visitor's questions come: what does it cost (the calculator in the hero), what is
 * there (the line of socks, the four shelves, the newest pairs), why here (the facts and the three steps), and then
 * the shop's own tools: a set for the family, asking for a price, gifts by the calendar, and the way to the stall.
 */
export function HomePage() {
  const { t } = useT();
  const pricing = usePricing();
  const min = pricing?.minOrderPairs ?? 1;
  const tiers = pricing?.tiers ?? [];

  return (
    <>
      <HeroCalculator minPairs={min} tiers={tiers} />
      <Clothesline />
      <CategoryTiles />
      <Shelf />
      <Facts tiers={tiers} />
      <FamilyPlanner minPairs={min} tiers={tiers} />
      <BazaarCalculator />
      <GiftCalendar />
      <ForBusiness />

      <section className="av-block" aria-labelledby="story-title" data-reveal>
        <div className="av-container av-story2">
          <div className="av-stack">
            <span className="av-eyebrow">{t("story.eyebrow")}</span>
            <h2 id="story-title">{t("story.title")}</h2>
            <p className="av-lead">{t("story.lead")}</p>
            <div className="av-row"><Button to="/visit" variant="secondary">{t("story.cta")}</Button></div>
          </div>
          <div className="av-story2__side">
            <div className="av-story2__socks" aria-hidden="true">
              {FAMILY.map((s, i) => <SockArt key={i} {...s} style={{ transform: `rotate(${(i - 2) * 5}deg)` }} />)}
            </div>
            <dl className="av-story2__facts">
              <div><dt>{t("story.started")}</dt><dd>{t("story.startedV")}</dd></div>
              <div><dt>{t("story.made")}</dt><dd>{t("story.madeV")}</dd></div>
              <div><dt>{t("story.sold")}</dt><dd>{t("story.soldV")}</dd></div>
              <div><dt>{t("story.run")}</dt><dd>{t("story.runV")}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <RouteMap />
    </>
  );
}
