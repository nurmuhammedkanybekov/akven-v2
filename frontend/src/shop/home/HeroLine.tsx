import { useRef } from "react";
import { HORN_LINE } from "../../brand/Ornaments";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { Link } from "react-router-dom";
import { upcomingHolidays } from "./GiftCalendar";

/** The family's socks on the line, each with a paper tag saying who it is for. x: where its peg sits (% of the arch). */
const LINE: Array<{ spec: SockSpec; x: number; w: number; tag: MessageKey; tilt: number; left?: boolean; low?: boolean }> = [
  { spec: { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold }, x: 17, w: 22, tag: "hero7.t1", tilt: -3 },
  { spec: { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream }, x: 40, w: 25, tag: "hero7.t2", tilt: 3, low: true },
  { spec: { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" }, x: 62, w: 22, tag: "hero7.t3", tilt: -2, left: true },
  { spec: { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white }, x: 83, w: 20, tag: "hero7.t4", tilt: 4, left: true, low: true },
];

/** Where the line hangs at a point across the arch: a gentle sag between two nails, in % of the arch's height. */
const sag = (x: number) => 27 + 8 * (x / 100) * (1 - x / 100) * 4;

/** The next gift holiday, when it is within six weeks: a small live chip above the headline, linking to the gift sets. */
function Season() {
  const { t } = useT();
  const next = upcomingHolidays()[0];
  if (!next || next.days > 42) return null;
  return (
    <Link to="/gifts" className="av-season">
      <span className="av-season__dot" aria-hidden="true" />
      {next.days === 0 ? t("season.today", { name: t(next.key) }) : t("season.in", { name: t(next.key), n: next.days })}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** A bundle wrapped in bojagi, the Korean cloth sewn from patches, tied on top: how the family wraps a gift box. */
function Bojagi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="20 50 160 140" aria-hidden="true">
      <defs>
        <clipPath id="bj-cloth"><path d="M22 92C60 78 140 78 178 92L186 172C140 186 60 186 14 172Z" /></clipPath>
      </defs>
      <ellipse cx="100" cy="178" rx="88" ry="9" fill="#000" opacity=".22" />
      <g clipPath="url(#bj-cloth)">
        <rect x="0" y="70" width="200" height="130" fill="#efe6d6" />
        <rect x="0" y="70" width="70" height="60" fill="#2f4f8a" />
        <rect x="70" y="70" width="64" height="44" fill="#e1b742" />
        <rect x="134" y="70" width="66" height="70" fill="#b8323a" />
        <rect x="0" y="130" width="52" height="70" fill="#e9c7c0" />
        <rect x="104" y="140" width="96" height="60" fill="#cfd8c4" />
        <path d="M70 70V130H0M134 70V140H200M70 114H134M52 130V200M104 140V200" fill="none" stroke="#fbf6ea" strokeWidth="2.4" strokeDasharray="6 4" />
      </g>
      {/* the knot: two corners of the cloth tied over the top, their ends folded out to each side */}
      <path d="M98 90C82 88 62 84 46 74C38 69 42 58 52 61C68 66 86 78 100 86Z" fill="#e1b742" />
      <path d="M102 90C118 88 138 84 154 74C162 69 158 58 148 61C132 66 114 78 100 86Z" fill="#2f4f8a" />
      <path d="M52 66C66 72 82 80 94 86" fill="none" stroke="#fbf6ea" strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M148 66C134 72 118 80 106 86" fill="none" stroke="#fbf6ea" strokeWidth="1.6" strokeDasharray="4 3" />
      <ellipse cx="100" cy="88" rx="14" ry="10" fill="#b8323a" />
      <path d="M91 84C96 90 104 90 109 84" fill="none" stroke="#7d1f25" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The first screen. On the left, the words: who we are, what we sell, two ways in. On the right, a doorway in the
 * shape of a yurt's arch, of navy felt with a stitched edge and a gold ram's-horn medallion at its crown, as on a
 * shyrdak; across it the family's socks on a washing line, each with a paper tag ("for dad", "for school"), swaying a
 * little; at its foot a gift wrapped in Korean bojagi; and on its corner the stall's red seal, as a Korean dojang
 * stamps a letter. The socks drop onto the line one by one on arrival and the scene leans with the pointer.
 */
export function HeroLine() {
  const { t } = useT();
  const scene = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = scene.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
  }
  const reset = () => { scene.current?.style.setProperty("--mx", "0"); scene.current?.style.setProperty("--my", "0"); };
  return (
    <section className="av-hero7" aria-labelledby="hero-title">
      <div className="av-container av-hero7__grid">
        <div className="av-hero7__copy">
          <Season />
          <p className="av-hero7__eyebrow av-hand">{t("hero6.eyebrow")}</p>
          <h1 id="hero-title" className="av-hero7__title">{t("hero6.title1")} <span>{t("hero6.title2")}</span></h1>
          <p className="av-hero7__lead">{t("hero6.lead")}</p>
          <div className="av-row av-hero7__ctas">
            <Button to="/shop" size="lg">{t("hero6.shop")}</Button>
            <Button to="/story" size="lg" variant="secondary">{t("hero.story")}</Button>
          </div>
          <ul className="av-hero7__promises">
            <li>{t("hero6.p1")}</li>
            <li>{t("hero6.p2")}</li>
            <li>{t("hero6.p3")}</li>
          </ul>
        </div>

        <div ref={scene} className="av-hero7__scene" aria-hidden="true" onPointerMove={onMove} onPointerLeave={reset}>
          <div className="av-hero7__arch">
            <svg className="av-hero7__crown" viewBox="-60 -60 120 120">
              {[0, 90, 180, 270].map((r) => (
                <path key={r} d={HORN_LINE} transform={`rotate(${r}) translate(0 -8) scale(0.5) translate(-47 -1)`} />
              ))}
              <path className="av-hero7__gem" d="M0 -9L7 0L0 9L-7 0Z" />
            </svg>
            <svg className="av-hero7__cord" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={`M0 ${sag(0)} Q50 ${sag(50) * 2 - sag(0)} 100 ${sag(100)}`} />
            </svg>
            {LINE.map((s, i) => (
              <span key={s.tag} className="av-hero7__sock" style={{ zIndex: i % 2 ? 3 : 2, "--x": `${s.x}%`, "--y": `${sag(s.x)}%`, "--w": `${s.w}%`, "--i": i, "--tilt": `${s.tilt}deg` } as React.CSSProperties}>
                <span className="av-hero7__peg" />
                <SockArt {...s.spec} />
                <span className={`av-hero7__tag${s.left ? " is-left" : ""}${s.low ? " is-low" : ""}`}>{t(s.tag)}</span>
              </span>
            ))}
            <Bojagi className="av-hero7__bojagi" />
          </div>
          <span className="av-hero7__seal"><span lang="ko">양말</span><span>70-E</span></span>
        </div>
      </div>
    </section>
  );
}
