import { useRef } from "react";
import { Logo } from "../../brand/Logo";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";

/** What hangs on the rail inside container 70-E: one of each kind the stall sells. */
const RAIL: SockSpec[] = [
  { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
  { cut: "mid-long", main: C.black, accent: C.mustard, pattern: "compression" },
  { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral },
  { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
];

/**
 * The opening scene: the family's real stall, container 70-E at Dordoi. Its steel doors swing open on a rail of
 * socks that sway, and lean away from the pointer as it passes. All of it is decoration (aria-hidden); the words
 * and links beside it carry the meaning. With reduced motion the doors are simply open.
 */
export function ContainerHero({ minPairs }: { minPairs: number }) {
  const { t } = useT();
  const rail = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const settle = useRef<number>();

  // A breeze from the pointer: the faster it moves across the rail, the further the socks lean, then they settle.
  function onMove(e: React.PointerEvent) {
    const now = performance.now();
    const prev = last.current;
    last.current = { x: e.clientX, t: now };
    if (!prev || !rail.current) return;
    const v = (e.clientX - prev.x) / Math.max(16, now - prev.t);
    const lean = Math.max(-14, Math.min(14, v * 9));
    rail.current.style.setProperty("--wind", `${lean.toFixed(1)}deg`);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => rail.current?.style.setProperty("--wind", "0deg"), 140);
  }

  return (
    <section className="av-hero2" aria-labelledby="hero-title">
      <div className="av-container av-hero2__grid">
        <div className="av-hero2__copy">
          <span className="av-hero2__tag"><i aria-hidden="true" />{t("hero.where")}</span>
          <h1 id="hero-title" className="av-hero2__title">
            <span>{t("hero.title1")}</span>
            <em>{t("hero.title2")}</em>
          </h1>
          <p className="av-hero2__lead">{minPairs > 1 ? t("hero.lead", { n: minPairs }) : t("hero.leadOne")}</p>
          <div className="av-row av-hero2__ctas">
            <Button to="/shop" variant="accent" size="lg" className="av-btn--shine">{t("hero.shop")}</Button>
            <Button to="/visit" variant="secondary" size="lg" className="av-btn--onnavy">{t("hero.visit")}</Button>
          </div>
          <dl className="av-hero2__facts">
            <div><dt>{t("hero.fact1")}</dt><dd>{t("hero.fact1v")}</dd></div>
            <div><dt>{t("hero.fact2")}</dt><dd>{t("hero.fact2v")}</dd></div>
            <div><dt>{t("hero.fact3")}</dt><dd>{t("hero.fact3v")}</dd></div>
          </dl>
        </div>

        <div className="av-stage" aria-hidden="true" onPointerMove={onMove} onPointerLeave={() => { last.current = null; }}>
          <div className="av-stage__sign"><Logo height={22} /><span>70-E</span></div>
          <div className="av-box">
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
            <div className="av-box__door av-box__door--l"><span className="av-box__bars" /></div>
            <div className="av-box__door av-box__door--r"><span className="av-box__bars" /><b>70-E</b></div>
          </div>
          <div className="av-stage__floor" />
        </div>
      </div>
    </section>
  );
}
