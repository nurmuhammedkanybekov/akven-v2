import { Logo } from "../brand/Logo";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import type { GiftBoxColour, GiftRibbon } from "../api/types";

export const BOX_COLOURS: Record<GiftBoxColour, { face: string; side: string; ink: string }> = {
  KRAFT: { face: "#c79d6d", side: "#a97f51", ink: "#5a3f22" },
  NAVY: { face: "#1f2a44", side: "#151d31", ink: "#c9a24b" },
  RED: { face: "#a8322d", side: "#86231f", ink: "#f4efe4" },
};
export const RIBBON_COLOURS: Record<GiftRibbon, string> = { GOLD: "#c9a24b", RED: "#c0392b", WHITE: "#f4f1ea" };

/** When the bag is empty, the box shows these, faintly, so the scene never looks broken. */
const EXAMPLE: SockSpec[] = [
  { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold },
  { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
];

export interface BoxSock { key: string; colorHex: string | null }

/**
 * The gift box, drawn: a box in the chosen colour with its ribbon and bow, the socks from the bag standing in it, and a
 * tag with the name. The lid lifts off to show what is inside and comes down when the card is being written. Each sock
 * drops in as it is added. Purely decoration (aria-hidden): the form next to it says the same in words.
 */
export function GiftBoxScene({ box, ribbon, socks, open, to }: { box: GiftBoxColour; ribbon: GiftRibbon; socks: BoxSock[]; open: boolean; to: string | null }) {
  const colours = BOX_COLOURS[box];
  const shown: Array<{ key: string; spec: SockSpec; ghost?: boolean }> = socks.length > 0
    ? socks.slice(0, 7).map((s, i) => ({ key: s.key, spec: { cut: i % 3 === 2 ? "mid-long" : "crew", main: s.colorHex ?? C.navy, accent: s.colorHex ?? C.navy, pattern: "rib", heel: true } }))
    : EXAMPLE.map((spec, i) => ({ key: `example-${i}`, spec, ghost: true }));
  const n = shown.length;
  return (
    <div className={`av-gbox${open ? " is-open" : ""}`} aria-hidden="true"
         style={{ "--face": colours.face, "--side": colours.side, "--mark": colours.ink, "--rib": RIBBON_COLOURS[ribbon] } as React.CSSProperties}>
      <div className="av-gbox__shadow" />
      <div className="av-gbox__inner" />
      <div className="av-gbox__socks">
        {shown.map((s, i) => (
          <span key={s.key} className={`av-gbox__sock${s.ghost ? " is-ghost" : ""}`}
                style={{ "--i": i, "--x": `${n === 1 ? 0 : (i / (n - 1) - 0.5) * 2}`, "--r": `${((i * 47) % 22) - 11}deg` } as React.CSSProperties}>
            <SockArt {...s.spec} />
          </span>
        ))}
      </div>
      <div className="av-gbox__base">
        <span className="av-gbox__band av-gbox__band--v" />
        <span className="av-gbox__mark"><Logo variant="mark" height="100%" /></span>
      </div>
      <div className="av-gbox__lid">
        <span className="av-gbox__band av-gbox__band--lid" />
        <svg className="av-gbox__bow" viewBox="0 0 120 60">
          <path d="M60 34C44 6 10 4 14 26c3 14 26 12 46 8Z" />
          <path d="M60 34c16-28 50-30 46-8-3 14-26 12-46 8Z" />
          <path className="av-gbox__tail" d="M56 36 40 60M64 36l16 24" />
          <circle cx="60" cy="34" r="7" />
        </svg>
      </div>
      <div className={`av-gbox__tag${to ? " has-name" : ""}`}><span>{to || "AKVEN"}</span></div>
    </div>
  );
}
