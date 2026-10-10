import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const WORDS: Array<[MessageKey, SockSpec]> = [
  ["style.noShow", { cut: "no-show", main: C.rose, accent: C.white, pattern: "dots" }],
  ["style.fiveToe", { cut: "ankle", main: C.sky, accent: C.mustard, pattern: "multistripe", toes: true, second: C.coral }],
  ["style.argyle", { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream }],
  ["style.oimo", { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold }],
  ["style.grip", { cut: "ankle", main: C.sage, accent: C.coral, grip: true, second: C.white }],
  ["style.thermal", { cut: "crew", main: C.oat, accent: C.beige, fluffy: true }],
  ["style.compression", { cut: "crew", main: C.black, accent: C.mustard, pattern: "compression" }],
  ["style.kneeHigh", { cut: "knee-high", main: C.charcoal, accent: C.grey, pattern: "rib" }],
  ["style.kids", { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream }],
  ["style.gift", { cut: "crew", main: C.red, accent: C.white, pattern: "snow" }],
];

/**
 * A slow band of every kind of sock the stall carries, under the hero. Decorative and duplicated for a seamless
 * loop, so it is hidden from screen readers; it stops on hover and for reduced motion.
 */
export function Marquee() {
  const { t } = useT();
  const run = (copy: number) => (
    <div className="av-marquee__run" key={copy}>
      {WORDS.map(([k, s], i) => (
        <span key={k} className={i % 2 ? "is-gold" : undefined}><SockArt {...s} />{t(k)}</span>
      ))}
    </div>
  );
  return <div className="av-marquee" aria-hidden="true"><div className="av-marquee__track">{run(0)}{run(1)}</div></div>;
}
