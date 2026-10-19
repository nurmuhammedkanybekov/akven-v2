import { useRef } from "react";
import { Logo } from "../../brand/Logo";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

/** The pairs on the table: the everyday colours people buy by the dozen, lying where they were put down. */
const LOOSE: Array<{ spec: SockSpec; x: number; y: number; r: number; w: number; z: number }> = [
  { spec: { cut: "crew", main: C.cream, accent: C.cream, pattern: "rib", heel: false }, x: 5, y: 5, r: -24, w: 29, z: 0.6 },
  { spec: { cut: "crew", main: C.navy, accent: C.navy, pattern: "rib" }, x: 73, y: 40, r: -16, w: 25, z: 1 },
  { spec: { cut: "ankle", main: C.white, accent: C.grey }, x: 3, y: 63, r: 12, w: 26, z: 0.8 },
  { spec: { cut: "mid-long", main: C.charcoal, accent: C.charcoal, pattern: "cable", heel: false }, x: 34, y: 70, r: -78, w: 24, z: 1.2 },
];
/** Folded pairs inside the box, on tissue paper. */
const FOLDED: SockSpec[] = [
  { cut: "crew", main: C.oat, accent: C.oat, pattern: "rib" },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "crew", main: C.white, accent: C.white, pattern: "rib" },
];

/**
 * The first screen: what AK&VEN sells, shown. The words on the left (who it is, what it is, two ways in, three
 * promises); on the right a still life on warm beige in afternoon light: an open AK&VEN box of folded pairs on tissue,
 * its lid beside it, loose pairs in cream, navy, white and charcoal. It is drawn, not photographed, until the family's
 * own photographs replace it, and it moves a little with the pointer (by depth) and settles into place on arrival.
 */
export function HeroEditorial() {
  const { t } = useT();
  const still = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = still.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  }
  return (
    <section className="av-hero6" aria-labelledby="hero-title">
      <div className="av-container av-hero6__grid">
        <div className="av-hero6__copy">
          <p className="av-hero6__eyebrow">{t("hero6.eyebrow")}</p>
          <h1 id="hero-title" className="av-hero6__title">{t("hero6.title1")}<br /><span>{t("hero6.title2")}</span></h1>
          <p className="av-hero6__lead">{t("hero6.lead")}</p>
          <div className="av-row av-hero6__ctas">
            <Button to="/shop" size="lg">{t("hero6.shop")}</Button>
            <Button to="/story" size="lg" variant="secondary">{t("hero.story")}</Button>
          </div>
          <ul className="av-hero6__promises">
            <li>{t("hero6.p1")}</li>
            <li>{t("hero6.p2")}</li>
            <li>{t("hero6.p3")}</li>
          </ul>
        </div>

        <div ref={still} className="av-still" aria-hidden="true" onPointerMove={onMove} onPointerLeave={() => { still.current?.style.setProperty("--mx", "0"); still.current?.style.setProperty("--my", "0"); }}>
          <div className="av-still__light" />
          {LOOSE.map((s, i) => (
            <span key={i} className="av-still__sock" style={{ "--x": `${s.x}%`, "--y": `${s.y}%`, "--r": `${s.r}deg`, "--w": `${s.w}%`, "--z": s.z, "--i": i } as React.CSSProperties}>
              <SockArt {...s.spec} />
            </span>
          ))}
          <div className="av-still__lid" style={{ "--z": 0.5 } as React.CSSProperties}>
            <Logo height="100%" metallic />
          </div>
          <div className="av-still__box" style={{ "--z": 0.9 } as React.CSSProperties}>
            <div className="av-still__tissue">
              {FOLDED.map((s, i) => (
                <span key={i} className="av-still__fold" style={{ "--i": i } as React.CSSProperties}><SockArt {...s} /></span>
              ))}
            </div>
          </div>
          <div className="av-still__tag" style={{ "--z": 1.3 } as React.CSSProperties}>
            <Logo variant="mark" height="100%" />
            <span>{t("hero6.tag")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
