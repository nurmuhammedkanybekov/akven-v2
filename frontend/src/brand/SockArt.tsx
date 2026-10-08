import { useId } from "react";

/**
 * A drawn sock: the stand-in for product photos until real ones exist, and the icon for each sock height.
 * Pure SVG, no network, coloured by props so a "navy with cream bands" sock looks like the real one.
 */
export type SockCut = "no-show" | "ankle" | "crew" | "mid-long" | "knee-high";
export type SockPattern = "plain" | "stripes" | "bands" | "dots" | "ribs" | "heart" | "kilim" | "ridge";

/** Where the top of the sock starts (smaller = taller), in the 0-160 drawing space. */
const TOP: Record<SockCut, number> = { "no-show": 96, ankle: 78, crew: 54, "mid-long": 34, "knee-high": 8 };

const OUTLINE = "#121a2c";

function path(top: number): string {
  return `M20 ${top}H60V100C60 108 68 112 80 113C102 114 114 120 114 132C114 144 104 148 92 148H36C22 148 14 142 14 130C14 120 20 114 20 100Z`;
}

interface SockArtProps {
  cut?: SockCut;
  main: string;
  accent: string;
  pattern?: SockPattern;
  className?: string;
  style?: React.CSSProperties;
  /** Line icon version for menus: no fill colours, takes the text colour. */
  outline?: boolean;
}

export function SockArt({ cut = "crew", main, accent, pattern = "plain", className, style, outline = false }: SockArtProps) {
  const clip = `sock-${useId().replace(/:/g, "")}`;
  const top = TOP[cut];
  const d = path(top);
  const stroke = outline ? "currentColor" : OUTLINE;
  return (
    <svg viewBox="4 2 120 156" className={className} style={style} aria-hidden="true" focusable="false">
      <defs><clipPath id={clip}><path d={d} /></clipPath></defs>
      <path d={d} fill={outline ? "none" : main} />
      {!outline && (
        <g clipPath={`url(#${clip})`}>
          {top < 92 && <rect x="14" y={top} width="52" height="14" fill={accent} />}
          <Pattern pattern={pattern} top={top} accent={accent} />
          <ellipse cx="25" cy="132" rx="16" ry="19" fill={accent} />
          <ellipse cx="112" cy="134" rx="15" ry="17" fill={accent} />
          <path d={`M24 ${top + 4}V98`} stroke="#fff" strokeWidth="3" opacity="0.16" />
        </g>
      )}
      {outline && top < 92 && <path d={`M20 ${top + 12}H60`} stroke="currentColor" strokeWidth="2" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={outline ? 4 : 2.2} strokeLinejoin="round" />
    </svg>
  );
}

function Pattern({ pattern, top, accent }: { pattern: SockPattern; top: number; accent: string }) {
  switch (pattern) {
    case "stripes":
      return <><rect x="14" y={top + 20} width="50" height="4" fill={accent} /><rect x="14" y={top + 29} width="50" height="4" fill={accent} /></>;
    case "bands":
      return <rect x="14" y={top + 22} width="50" height="12" fill={accent} />;
    case "dots": {
      const dots = [];
      for (let y = top + 22; y < 96; y += 14) for (let x = 26; x < 60; x += 14) dots.push(<circle key={`${x}-${y}`} cx={x + ((y / 14) % 2 >= 1 ? 7 : 0)} cy={y} r="2.6" fill={accent} />);
      return <>{dots}</>;
    }
    case "ribs": {
      const ribs = [];
      for (let x = 24; x < 60; x += 6) ribs.push(<line key={x} x1={x} y1={top + 14} x2={x} y2="98" stroke={accent} strokeWidth="1.6" opacity="0.55" />);
      return <>{ribs}</>;
    }
    case "heart":
      return <path transform={`translate(40 ${top + 44}) scale(.9)`} d="M0 12C-14 2-14 -10 -6 -10C-2 -10 0 -7 0 -4C0 -7 2 -10 6 -10C14 -10 14 2 0 12Z" fill={accent} />;
    case "kilim":
    case "ridge": {
      const shape = pattern === "kilim"
        ? <><path d="M50 4L96 50L50 96L4 50Z" /><path d="M50 24L76 50L50 76L24 50Z" /></>
        : <path d="M4 70L24 30L40 56L60 18L78 54L96 34" />;
      const n = Math.max(1, Math.floor((96 - (top + 20)) / 20));
      return <>{Array.from({ length: n }, (_, k) => (
        <g key={k} transform={`translate(18 ${top + 20 + k * 19}) scale(.42)`} fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round">{shape}</g>
      ))}</>;
    }
    default:
      return null;
  }
}

/** A few of the shop's colourways, for illustrations. */
export const SOCK_COLOURS = {
  navy: "#1f2a44", black: "#23211d", grey: "#8a8d91", white: "#efece4", cream: "#e9dfc8", rose: "#d9a3a6",
  brick: "#9b4a3a", charcoal: "#4a4d52", brown: "#6b4a35", beige: "#cdb99a", pink: "#e7b4c4", mint: "#a7cbb8",
  gold: "#c9a24b", sky: "#8fb1cf", indigo: "#243a7a",
} as const;
