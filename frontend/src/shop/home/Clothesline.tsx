import { useRef } from "react";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";

/** One of each new design, the way pairs hang to dry over the passages at Dordoi. */
const LINE: SockSpec[] = [
  { cut: "crew", main: C.white, accent: C.black, pattern: "checker" },
  { cut: "knee-high", main: C.cream, accent: C.burgundy, pattern: "fairisle", second: C.ivory },
  { cut: "ankle", main: C.ivory, accent: C.red, pattern: "cherries" },
  { cut: "crew", main: C.sky, accent: C.slate, pattern: "mountains", second: C.ivory },
  { cut: "crew", main: C.charcoal, accent: C.pink, pattern: "cat", second: C.ivory },
  { cut: "mid-long", main: C.oat, accent: C.oat, pattern: "cable", heel: false },
  { cut: "ankle", main: C.white, accent: C.pink, pompom: true },
  { cut: "crew", main: C.ivory, accent: C.red, pattern: "shyrdak", second: C.navy },
  { cut: "crew", main: C.lilac, accent: C.sky, pattern: "tiedye", second: C.peach },
  { cut: "knee-high", main: C.forest, accent: C.forest, pattern: "football", second: C.ivory },
  { cut: "crew", main: C.sage, accent: C.mustard, pattern: "flowers", second: C.ivory },
  { cut: "ankle", main: C.ice, accent: C.denim, pattern: "waves", second: C.ivory },
  { cut: "crew", main: C.indigo, accent: C.ink, pattern: "skyline", second: C.lemon },
  { cut: "crew", main: C.ivory, accent: C.pink, pattern: "bunny", second: C.ivory },
];

/** Width of one run of the line, and of each sag between two pegs' worth of rope. */
const RUN = 1960;
const SPAN = RUN / LINE.length;
const SAG = 20;
const ROPE_Y = 14;

/** Height of the rope at x: it sags between anchor points, one sock per sag. */
function ropeY(x: number): number {
  const u = (x % SPAN) / SPAN;
  return ROPE_Y + SAG * 4 * u * (1 - u);
}

/**
 * A washing line across the page under the hero: the drawn socks pegged on a rope, drifting slowly sideways and
 * swaying a little; a quick pointer pass makes them lean away like a breeze. Decoration only (aria-hidden), two
 * copies for a seamless loop, still for visitors who ask for less motion.
 */
export function Clothesline() {
  const track = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; t: number } | null>(null);
  const settle = useRef<number>();

  function onMove(e: React.PointerEvent) {
    const now = performance.now();
    const prev = last.current;
    last.current = { x: e.clientX, t: now };
    if (!prev || !track.current) return;
    const lean = Math.max(-16, Math.min(16, ((e.clientX - prev.x) / Math.max(16, now - prev.t)) * 10));
    track.current.style.setProperty("--wind", `${lean.toFixed(1)}deg`);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => track.current?.style.setProperty("--wind", "0deg"), 160);
  }

  const rope = Array.from({ length: LINE.length }, (_, i) => `M${i * SPAN} ${ROPE_Y}Q${i * SPAN + SPAN / 2} ${ROPE_Y + SAG * 2} ${(i + 1) * SPAN} ${ROPE_Y}`).join("");
  const run = (copy: number) => (
    <div className="av-line__run" key={copy} style={{ width: RUN }}>
      <svg className="av-line__rope" width={RUN} height={ROPE_Y + SAG * 2 + 4} viewBox={`0 0 ${RUN} ${ROPE_Y + SAG * 2 + 4}`}><path d={rope} /></svg>
      {LINE.map((s, i) => {
        const x = i * SPAN + SPAN / 2;
        return (
          <div key={i} className="av-line__sock" style={{ left: x, top: ropeY(x), "--i": i } as React.CSSProperties}>
            <span className="av-line__peg" />
            <div className="av-line__sway"><SockArt {...s} /></div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="av-line" aria-hidden="true" onPointerMove={onMove} onPointerLeave={() => { last.current = null; }}>
      <div className="av-line__track" ref={track}>{run(0)}{run(1)}</div>
    </div>
  );
}
