import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { Button } from "../components/Button";
import { usePageTitle } from "../hooks/usePageTitle";
import { useT } from "../i18n/I18n";
import { DordoiStory } from "../shop/home/DordoiStory";
import { TwoNames } from "../shop/home/TwoNames";

/** A family's worth of socks, one for each of them. */
const FAMILY: SockSpec[] = [
  { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
  { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
];

/**
 * Our story: the two names, the stall at Dordoi as the scene that plays on scroll, and the plain facts (since when,
 * where the socks are made, where they are sold, who runs it), with the way to the stall.
 */
export function StoryPage() {
  const { t } = useT();
  usePageTitle(t("nav.story"));
  return (
    <>
      <TwoNames page />
      <DordoiStory />
      <section className="av-block" aria-labelledby="facts-title">
        <div className="av-container av-story2">
          <div className="av-stack">
            <span className="av-eyebrow">{t("story.eyebrow")}</span>
            <h2 id="facts-title">{t("story.title")}</h2>
            <p className="av-lead">{t("storyp.more")}</p>
            <div className="av-row"><Button to="/visit">{t("story.cta")}</Button><Button to="/shop" variant="secondary">{t("hero6.shop")}</Button></div>
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
    </>
  );
}
