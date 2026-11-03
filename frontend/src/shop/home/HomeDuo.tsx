import { Link } from "react-router-dom";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Peg } from "../../components/Clothesline";
import { GiftBoxScene } from "../../components/GiftBoxScene";
import { useT } from "../../i18n/I18n";
import { INSIDE, useGiftLooks } from "./GiftTeaser";

/** Dad, mum and a child: the same sock in three sizes on one line. */
const FAMILY: Array<{ spec: SockSpec; size: number }> = [
  { spec: { cut: "crew", main: C.navy, accent: C.gold, pattern: "oimo", second: C.cream }, size: 1 },
  { spec: { cut: "crew", main: C.navy, accent: C.gold, pattern: "oimo", second: C.cream }, size: 0.84 },
  { spec: { cut: "crew", main: C.navy, accent: C.gold, pattern: "oimo", second: C.cream }, size: 0.62 },
];

/**
 * Two things people do for others, side by side: a gift box packed at the stall, and one set of socks for the whole
 * family. Each card shows what it is and leads to the page where it is built.
 */
export function HomeDuo() {
  const { t } = useT();
  const { box, ribbon, open } = useGiftLooks();
  return (
    <section className="av-block" aria-label={t("duo.label")} data-reveal>
      <div className="av-container av-duo">
        <article className="av-duo__card av-duo__card--gift">
          <div className="av-duo__art"><GiftBoxScene box={box} ribbon={ribbon} socks={INSIDE} open={open} to={t("giftt.tag")} /></div>
          <div className="av-duo__copy">
            <span className="av-hand">{t("gb.eyebrow")}</span>
            <h2><Link to="/gift" className="av-duo__link">{t("giftt.title")}</Link></h2>
            <p>{t("giftt.lead")}</p>
            <span className="av-duo__go" aria-hidden="true">{t("giftt.cta")} →</span>
            <Link to="/gifts" className="av-duo__also">{t("giftt.sets")}</Link>
          </div>
        </article>
        <article className="av-duo__card av-duo__card--family">
          <div className="av-duo__art av-duo__line" aria-hidden="true">
            {FAMILY.map((f, i) => (
              <span key={i} className="av-duo__sock" style={{ "--s": f.size, "--i": i } as React.CSSProperties}>
                <Peg className="av-duo__peg" />
                <SockArt {...f.spec} />
              </span>
            ))}
          </div>
          <div className="av-duo__copy">
            <span className="av-hand">{t("family.eyebrow")}</span>
            <h2><Link to="/family" className="av-duo__link">{t("duo.familyTitle")}</Link></h2>
            <p>{t("duo.familyLead")}</p>
            <span className="av-duo__go" aria-hidden="true">{t("duo.familyGo")} →</span>
          </div>
        </article>
      </div>
    </section>
  );
}
