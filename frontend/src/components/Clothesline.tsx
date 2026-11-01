import { SockArt, type SockSpec } from "../brand/SockArt";
import { sockBounds, sockTop } from "../brand/sockDrawing";

/** A wooden clothes peg, as on the product pictures. */
export function Peg({ className }: { className?: string }) {
  return (
    <svg className={className ?? "av-peg"} viewBox="-12 -31 24 68" aria-hidden="true" focusable="false">
      <rect x="-11" y="-30" width="22" height="66" rx="5" fill="#c99d66" />
      <rect x="-11" y="-30" width="11" height="66" rx="5" fill="#fff" fillOpacity=".18" />
      <path d="M0 -28V34" stroke="#7a5532" strokeOpacity=".55" strokeWidth="1.6" />
      <rect x="-13" y="-4" width="26" height="7" rx="2.5" fill="#8f9396" />
      <rect x="-11" y="-30" width="22" height="66" rx="5" fill="none" stroke="#6d4a2b" strokeOpacity=".35" />
    </svg>
  );
}

/** Where the line is tied at both ends, from the top of the box (0-100). */
const TOP = 8;

/** Where the cuff's middle sits inside a sock drawing, as fractions of its box: the peg goes there. */
function cuff(cut: SockSpec["cut"]): { x: number; y: number } {
  const b = sockBounds(cut);
  const top = cut === "no-show" ? sockTop(cut) - 4 : sockTop(cut);
  return { x: (50 - b.x) / b.w, y: (top - b.y) / b.h };
}

/**
 * A washing line with socks pegged to it, the way the stall dries and shows them. Each sock hangs from its cuff and
 * swings from the peg (transform only) when the line is hovered or the parent asks it to; at rest they sway a little,
 * unless the visitor prefers less motion. `at` places each sock along the line (0 to 1); the line sags in the middle.
 */
export function Clothesline({ socks, at, width = 0.3, sag = 0.12, className }: {
  socks: SockSpec[];
  /** Positions along the line, 0 to 1; spread evenly when left out. */
  at?: number[];
  /** Each sock's width as a share of the line. */
  width?: number;
  /** How far the middle of the line hangs below its ends, as a share of the line's box height. */
  sag?: number;
  className?: string;
}) {
  const n = socks.length;
  const xs = at ?? socks.map((_, i) => (n === 1 ? 0.5 : 0.18 + (0.64 / (n - 1)) * i));
  return (
    <div className={`av-cl ${className ?? ""}`} aria-hidden="true">
      <svg className="av-cl__line" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <path d={`M-2 ${TOP}Q50 ${TOP + 2 * sag * 100} 102 ${TOP}`} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {socks.map((s, i) => {
        const x = xs[i];
        const y = TOP + sag * 100 * 4 * x * (1 - x);          // the quadratic's height at x, in the 0-100 box
        const c = cuff(s.cut);
        return (
          <span key={i} className="av-cl__item" style={{ left: `${x * 100}%`, top: `${y}%`, width: `${width * 100}%`, "--i": i } as React.CSSProperties}>
            <span className="av-cl__swing" style={{ transformOrigin: `${c.x * 100}% ${c.y * 100}%`, translate: `${-c.x * 100}% ${-c.y * 100}%`, "--cx": `${c.x * 100}%`, "--cy": `${c.y * 100}%` } as React.CSSProperties}>
              <SockArt {...s} />
              <Peg className="av-cl__peg" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
