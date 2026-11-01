import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { useT } from "../../i18n/I18n";

/** The packs standing in the open case: a shop's mixed season, one pack of each. */
const PACKS: SockSpec[] = [
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "rib" },
  { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.navy, heel: true },
  { cut: "crew", main: C.charcoal, accent: C.gold, pattern: "stripes", second: C.gold },
  { cut: "crew", main: C.brick, accent: C.cream, pattern: "dots", second: C.cream },
  { cut: "crew", main: C.forest, accent: C.mustard, pattern: "rib" },
];

/**
 * An open cardboard case as the stall packs it: kraft walls, the flaps folded out, a strip of tape, and the label the
 * family writes by hand. Socks are drawn between the back wall and the front wall, so they stand inside the case;
 * they rise into it once when the page opens (transform only).
 */
export function CaseArt() {
  const { t } = useT();
  return (
    <div className="av-case" aria-hidden="true">
      <svg className="av-case__back" viewBox="0 0 360 300">
        <path d="M100 96 112 30 322 26 330 96Z" fill="var(--kraft-2)" />
        <path d="M40 122 100 96H330L270 122Z" fill="var(--kraft-3)" />
      </svg>
      <div className="av-case__packs">
        {PACKS.map((s, i) => <SockArt key={i} {...s} style={{ "--k": i } as React.CSSProperties} />)}
      </div>
      <svg className="av-case__front" viewBox="0 0 360 300">
        <path d="M40 122 100 96 66 58 8 86Z" fill="var(--kraft-2)" />
        <path d="M270 122 330 96 356 136 300 158Z" fill="var(--kraft-3)" />
        <path d="M270 122 330 96V250L270 282Z" fill="var(--kraft-3)" />
        <rect x="40" y="122" width="230" height="160" fill="var(--kraft)" />
        <path d="M40 122h230" stroke="var(--kraft-3)" strokeWidth="2" />
        <rect x="136" y="122" width="38" height="44" fill="rgb(255 255 255 / 0.22)" />
        <g transform="rotate(-3 145 214)">
          <rect x="70" y="178" width="152" height="78" rx="3" fill="#f6f0e2" />
          <text x="84" y="204" className="av-case__hand av-case__hand--big">AK&amp;VEN · 70-E</text>
          <text x="84" y="226" className="av-case__hand">{t("whole.boxLabel")}</text>
          <text x="84" y="246" className="av-case__hand">→ {t("whole.boxTo")}</text>
        </g>
        <g className="av-case__arrows" stroke="#4a3624" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M292 214v-30m-8 8 8-8 8 8M312 206v-30m-8 8 8-8 8 8" />
        </g>
      </svg>
    </div>
  );
}
