import { useEffect, useRef } from "react";
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

/** The neighbours on each floor, outwards from ours: colour and number, as in a Dordoi passage. */
const LEFT = [{ c: "#7c3b2e", n: "70-D" }, { c: "#3f5a4a", n: "70-C" }, { c: "#8a6a2f", n: "70-B" }, { c: "#55606e", n: "70-A" }];
const RIGHT = [{ c: "#55606e", n: "70-F" }, { c: "#8a3c35", n: "70-G" }, { c: "#2f4d6b", n: "70-H" }, { c: "#5c5a3a", n: "70-I" }];
const UP_LEFT = [{ c: "#2f4d6b", n: "D-2" }, { c: "#6b4a35", n: "C-2" }, { c: "#55606e", n: "B-2" }, { c: "#3f5a4a", n: "A-2" }];
const UP_RIGHT = [{ c: "#7c3b2e", n: "F-2" }, { c: "#3f5a4a", n: "G-2" }, { c: "#8a6a2f", n: "H-2" }, { c: "#55606e", n: "I-2" }];

function Closed({ c, n, side, i }: { c: string; n: string; side: "l" | "r"; i: number }) {
  return <span className={`av-yard__box av-yard__box--${side}`} data-n={n} style={{ "--c": c, "--d": i } as React.CSSProperties} />;
}

/** 0 before a, 1 after b, eased in between. */
const ease = (p: number, a: number, b: number) => { const x = Math.min(1, Math.max(0, (p - a) / (b - a))); return x * x * (3 - 2 * x); };

/**
 * "From Dordoi, with love": the family's stall as a short scene that plays as the visitor scrolls. A passage at night,
 * containers on two floors; 70-E's sign lights up in gold, the view moves in towards it, its doors open on a rail of
 * socks, and the way to the family's story appears. The section is pinned while it plays (taller than the screen, with
 * a sticky stage), and only transforms and opacity change, set once per frame. With reduced motion it is simply the
 * finished scene. The scene is decoration (aria-hidden); the words and links carry the meaning.
 */
export function DordoiStory() {
  const { t } = useT();
  const stall = useShopInfo()?.pickupPoints[0];
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const settle = useRef<number>();

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { el.classList.add("is-still"); return; }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / travel));
      el.style.setProperty("--glow", ease(p, 0.08, 0.3).toFixed(3));
      el.style.setProperty("--zoom", ease(p, 0.22, 0.62).toFixed(3));
      el.style.setProperty("--doors", ease(p, 0.5, 0.8).toFixed(3));
      const cta = ease(p, 0.78, 0.95);
      el.style.setProperty("--cta", cta.toFixed(3));
      el.classList.toggle("is-done", cta > 0.5);
      el.style.setProperty("--intro", (1 - ease(p, 0.18, 0.34)).toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

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
    <section ref={section} className="av-dordoi" aria-labelledby="dordoi-title" onPointerMove={onMove} onPointerLeave={() => { last.current = null; }}>
      <div className="av-dordoi__stage">
        <div className="av-hero5__sky" aria-hidden="true">
          <div className="av-hero5__lights">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>
        </div>

        <div className="av-container av-dordoi__intro">
          <span className="av-eyebrow">{t("dordoi.eyebrow")}</span>
          <h2 id="dordoi-title">{t("dordoi.title")}</h2>
          <p>{t("dordoi.lead")}</p>
        </div>

        <div className="av-dordoi__view" aria-hidden="true">
          <div className="av-yard">
            <div className="av-yard__floor av-yard__floor--up">
              {[...UP_LEFT].reverse().map((b, i) => <Closed key={b.n} {...b} side="l" i={UP_LEFT.length - i} />)}
              <span className="av-yard__box" data-n="E-2" style={{ "--c": "#2f4d6b", "--d": 0 } as React.CSSProperties} />
              {UP_RIGHT.map((b, i) => <Closed key={b.n} {...b} side="r" i={i + 1} />)}
            </div>
            <div className="av-yard__walk" />
            <div className="av-yard__floor av-yard__floor--down">
              {[...LEFT].reverse().map((b, i) => <Closed key={b.n} {...b} side="l" i={LEFT.length - i} />)}
              <div className="av-yard__ours">
                <span className="av-yard__sign"><Logo height="100%" /><b>70-E</b></span>
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
                  <div className="av-yard__door av-yard__door--l"><span className="av-box__bars" /><Logo variant="mark" height="26%" className="av-yard__emboss" /></div>
                  <div className="av-yard__door av-yard__door--r"><span className="av-box__bars" /><Logo variant="mark" height="26%" className="av-yard__emboss" /></div>
                </div>
              </div>
              {RIGHT.map((b, i) => <Closed key={b.n} {...b} side="r" i={i + 1} />)}
            </div>
            <div className="av-yard__ground" />
          </div>
        </div>

        <div className="av-container av-dordoi__end">
          <p className="av-dordoi__where">{t("dordoi.where")}</p>
          <div className="av-row">
            <Button to="/story" variant="accent">{t("hero.story")}</Button>
            <Button to="/visit" variant="secondary" className="av-btn--onnavy">{t("dordoi.visit")}</Button>
          </div>
          {stall && <OpenNow point={stall} />}
        </div>
      </div>
    </section>
  );
}
