import { useRef } from "react";
import { Logo } from "../../brand/Logo";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { OpenNow } from "../../components/OpenNow";
import { useT } from "../../i18n/I18n";
import { useShopInfo } from "../useShopInfo";

/** What hangs on the rail inside container 70-E: one of each kind the stall sells. */
const RAIL: SockSpec[] = [
  { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  { cut: "crew", main: C.charcoal, accent: C.pink, pattern: "cat", second: C.ivory },
  { cut: "mid-long", main: C.oat, accent: C.oat, pattern: "cable", heel: false },
  { cut: "crew", main: C.white, accent: C.black, pattern: "checker" },
  { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
];

/** The neighbours in the row: closed containers in the colours you see walking down a Dordoi passage. */
const ROW = ["#7c3b2e", "#3f5a4a", "#55606e", "#8a6a2f"];

/**
 * The opening scene, standing in for a photograph: night at Dordoi, a row of closed containers, and the family's
 * own, 70-E, whose doors swing open on a rail of socks that sway and lean away from the pointer, with warm light
 * spilling onto the ground. The scene is decoration (aria-hidden) behind the headline; the words and links carry the
 * meaning. With reduced motion the doors are simply open.
 */
export function ContainerHero({ minPairs }: { minPairs: number }) {
  const { t } = useT();
  const stall = useShopInfo()?.pickupPoints[0];
  const rail = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const settle = useRef<number>();

  // A breeze from the pointer: the faster it moves across the scene, the further the socks lean, then they settle.
  function onMove(e: React.PointerEvent) {
    const now = performance.now();
    const prev = last.current;
    last.current = { x: e.clientX, t: now };
    if (!prev || !rail.current) return;
    const v = (e.clientX - prev.x) / Math.max(16, now - prev.t);
    rail.current.style.setProperty("--wind", `${Math.max(-14, Math.min(14, v * 9)).toFixed(1)}deg`);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => rail.current?.style.setProperty("--wind", "0deg"), 140);
  }

  return (
    <section className="av-hero4" aria-labelledby="hero-title" onPointerMove={onMove} onPointerLeave={() => { last.current = null; }}>
      <div className="av-hero4__scene" aria-hidden="true">
        <div className="av-hero4__lights">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>
        <div className="av-hero4__ground" />
        <div className="av-hero4__row">
          {ROW.map((c, i) => <span key={i} className={`av-ghost av-ghost--${i}`} style={{ "--c": c } as React.CSSProperties} />)}
        </div>
        <div className="av-stage">
          <div className="av-stage__sign"><Logo height={30} /></div>
          <div className="av-box">
            <span className="av-box__plate">70-E</span>
            <div className="av-box__inside">
              <div className="av-box__rail" />
              <div className="av-box__socks" ref={rail}>
                {RAIL.map((s, i) => (
                  <div key={i} className="av-hang" style={{ "--i": i } as React.CSSProperties}>
                    <span className="av-hang__peg" />
                    <div className="av-hang__sway"><SockArt {...s} /></div>
                  </div>
                ))}
              </div>
              <div className="av-box__shelf" />
            </div>
            <div className="av-box__door av-box__door--l"><span className="av-box__bars" /><Logo variant="mark" height="28%" className="av-box__emboss" /></div>
            <div className="av-box__door av-box__door--r"><span className="av-box__bars" /><Logo variant="mark" height="28%" className="av-box__emboss" /></div>
          </div>
          <div className="av-stage__floor" />
        </div>
      </div>

      <div className="av-container av-hero4__copy">
        <p className="av-hero4__where">{t("hero.where")}</p>
        <h1 id="hero-title" className="av-hero4__title">{t("hero.title1")} <em>{t("hero.title2")}</em></h1>
        <p className="av-hero4__lead">{minPairs > 1 ? t("hero.lead", { n: minPairs }) : t("hero.leadOne")}</p>
        <div className="av-row av-hero4__ctas">
          <Button to="/shop" variant="accent" size="lg">{t("hero.shop")}</Button>
          <Button to="/#family" variant="secondary" size="lg" className="av-btn--onnavy">{t("hero.family")}</Button>
        </div>
        {stall && <OpenNow point={stall} />}
      </div>
    </section>
  );
}
