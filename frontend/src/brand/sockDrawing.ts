/**
 * The drawn sock, as SVG markup. One drawing serves the shop (SockArt) and the product images
 * (scripts/generate-product-art.mjs), so a sock looks the same in the hero, on a card and on its page.
 *
 * The sock points right with its cuff at the top. The leg is 100 units wide and the ankle line sits at y = 200;
 * taller cuts start higher. Knit texture, a ribbed cuff, a contrast heel and toe, and soft shading make it read as
 * a knitted thing rather than a flat icon. Plain TypeScript with no imports, so Node can run it for the image script.
 */

export type SockCut = "no-show" | "ankle" | "crew" | "mid-long" | "knee-high";
export type SockPattern =
  | "plain" | "rib" | "pinstripe" | "stripes" | "bands" | "multistripe" | "argyle" | "dots" | "hearts"
  | "oimo" | "bear" | "dino" | "compression" | "sparkle" | "snow";

export interface SockSpec {
  cut: SockCut;
  main: string;
  accent: string;
  /** A third colour for patterns that need one; defaults to a light cream. */
  second?: string;
  pattern?: SockPattern;
  /** Contrast heel and toe (default true). */
  heel?: boolean;
  /** Five-toe sock: the toe is knitted as separate toes. */
  toes?: boolean;
  /** Non-slip dots on the sole. */
  grip?: boolean;
  /** A lace frill on the cuff. */
  lace?: boolean;
  /** Soft, brushed yarn: a fuzzy edge and flecks. */
  fluffy?: boolean;
}

/** Ankle line. */
const A = 200;
/** Where the sock's top edge starts for each cut (no-show is shaped separately). */
const TOP: Record<SockCut, number> = { "no-show": A + 30, ankle: 138, crew: 56, "mid-long": -4, "knee-high": -126 };

export function sockTop(cut: SockCut): number {
  return TOP[cut];
}

/** The drawing's bounds, for a viewBox: room for ears, spikes and frills around the outline. */
export function sockBounds(cut: SockCut): { x: number; y: number; w: number; h: number } {
  const y = TOP[cut] - 22;
  return { x: -22, y, w: 256, h: A + 104 - y };
}

/** The sock's silhouette as an SVG path, in the shared drawing space. */
export function sockOutline(cut: SockCut): string {
  const foot =
    `C100 ${A + 22} 118 ${A + 32} 148 ${A + 34}H186C212 ${A + 34} 226 ${A + 52} 226 ${A + 68}` +
    `C226 ${A + 88} 210 ${A + 100} 188 ${A + 100}H44C14 ${A + 100} -4 ${A + 80} -2 ${A + 52}`;
  if (cut === "no-show") return `M-1 ${A + 44}C24 ${A + 30} 92 ${A + 26} 100 ${A + 22}${foot}Z`;
  return `M0 ${TOP[cut]}H100V${A}${foot}C-1 ${A + 40} 0 ${A + 30} 0 ${A + 16}Z`;
}

/** Escapes a value placed in an attribute. Colours come from code, but nothing unescaped goes into markup. */
function a(v: string): string {
  return v.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v < to; v += step) out.push(v);
  return out;
}

const HEART = "M0 7C-9 1-9-6-4-6C-2-6 0-4 0-2C0-4 2-6 4-6C9-6 9 1 0 7Z";

/** Leg and foot decoration, drawn inside the sock's clip. */
function pattern(spec: SockSpec, top: number): string {
  const { accent } = spec;
  const second = spec.second ?? "#f4efe4";
  const legTop = spec.cut === "no-show" ? A + 36 : top + 34;
  const bottom = A + 104;
  switch (spec.pattern ?? "plain") {
    case "rib":
      return range(-4, 232, 9).map((x) => `<path d="M${x} ${top}V${bottom}" stroke="#000" stroke-opacity=".11" stroke-width="2.4"/>`).join("");
    case "pinstripe":
      return range(6, 100, 11).map((x) => `<path d="M${x} ${legTop}V${A + 8}" stroke="${a(accent)}" stroke-opacity=".75" stroke-width="1.6"/>`).join("");
    case "stripes":
      return [legTop + 8, legTop + 24].filter((y) => y < A).map((y) => `<rect x="-10" y="${y}" width="120" height="8" fill="${a(accent)}"/>`).join("");
    case "bands":
      return `<rect x="-10" y="${legTop + 6}" width="120" height="20" fill="${a(accent)}"/>` +
        (legTop + 36 < A ? `<rect x="-10" y="${legTop + 34}" width="120" height="5" fill="${a(accent)}"/>` : "");
    case "multistripe": {
      const colours = [accent, second, "#ffffff"];
      return range(legTop - 4, bottom, 24).map((y, i) => `<rect x="-10" y="${y}" width="250" height="12" fill="${a(colours[i % 3])}" fill-opacity="${i % 3 === 2 ? 0.55 : 1}"/>`).join("");
    }
    case "argyle": {
      const out: string[] = [];
      range(legTop + 4, A - 4, 52).forEach((y, row) => {
        [0, 50, 100].forEach((x, col) => {
          const fill = (row + col) % 2 ? second : accent;
          out.push(`<path d="M${x} ${y}L${x + 25} ${y + 26}L${x} ${y + 52}L${x - 25} ${y + 26}Z" fill="${a(fill)}"/>`);
        });
      });
      out.push(`<g stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="4 4">` +
        range(-150, 120, 50).map((x) => `<path d="M${x} ${legTop}L${x + 200} ${legTop + 208}M${x + 200} ${legTop}L${x} ${legTop + 208}"/>`).join("") + `</g>`);
      return out.join("");
    }
    case "dots":
      return range(legTop, bottom, 22).flatMap((y, r) => range(r % 2 ? 0 : 11, 240, 22).map((x) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${a(accent)}"/>`)).join("");
    case "hearts":
      return range(legTop + 10, A + 4, 30).flatMap((y, r) => range(r % 2 ? 16 : 34, 100, 36).map((x) => `<path transform="translate(${x} ${y}) scale(1.15)" d="${HEART}" fill="${a(accent)}"/>`)).join("");
    case "snow":
      return range(legTop + 12, bottom, 34).flatMap((y, r) => range(r % 2 ? 14 : 34, 230, 40).map((x) =>
        `<g transform="translate(${x} ${y})" stroke="${a(accent)}" stroke-width="2.2" stroke-linecap="round"><path d="M0-7V7M-6-3.5L6 3.5M-6 3.5L6-3.5"/></g>`)).join("");
    case "oimo": {
      // The Kyrgyz oimo band: a chain of rhombuses with a smaller one inside, between two thin rules.
      const band = (y: number) =>
        `<rect x="-10" y="${y}" width="250" height="38" fill="${a(accent)}"/>` +
        `<path d="M-10 ${y + 4}H240M-10 ${y + 34}H240" stroke="${a(second)}" stroke-width="2"/>` +
        range(-6, 240, 26).map((x) =>
          `<path d="M${x} ${y + 8}L${x + 11} ${y + 19}L${x} ${y + 30}L${x - 11} ${y + 19}Z" fill="${a(second)}"/><path d="M${x} ${y + 14}L${x + 5} ${y + 19}L${x} ${y + 24}L${x - 5} ${y + 19}Z" fill="${a(accent)}"/>`).join("");
      const ys = spec.cut === "no-show" ? [A + 40] : [legTop + 4, ...(A - legTop > 150 ? [A - 46] : [])];
      return ys.map(band).join("");
    }
    case "bear": {
      const m = spec.cut === "no-show" ? A + 60 : Math.max(legTop + 30, Math.min(A - 40, (legTop + A) / 2));
      return `<ellipse cx="50" cy="${m + 18}" rx="20" ry="14" fill="${a(second)}"/>` +
        `<circle cx="34" cy="${m}" r="5" fill="#1b1d26"/><circle cx="66" cy="${m}" r="5" fill="#1b1d26"/>` +
        `<circle cx="35.6" cy="${m - 1.6}" r="1.5" fill="#fff"/><circle cx="67.6" cy="${m - 1.6}" r="1.5" fill="#fff"/>` +
        `<path d="M44 ${m + 12}H56L50 ${m + 18}Z" fill="#1b1d26" stroke="#1b1d26" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M50 ${m + 18}V${m + 23}M44 ${m + 24}Q50 ${m + 28} 56 ${m + 24}" stroke="#1b1d26" stroke-width="2" fill="none" stroke-linecap="round"/>` +
        `<ellipse cx="22" cy="${m + 12}" rx="7" ry="4.5" fill="#f3a3a8" fill-opacity=".8"/><ellipse cx="78" cy="${m + 12}" rx="7" ry="4.5" fill="#f3a3a8" fill-opacity=".8"/>`;
    }
    case "dino":
      return range(legTop + 6, bottom, 30).flatMap((y, r) => range(r % 2 ? 30 : 60, 230, 62).map((x) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="6.5" fill="${a(second)}" fill-opacity=".9"/>`)).join("");
    case "compression":
      return range(legTop - 40, A + 20, 34).map((y) => `<path d="M-10 ${y + 22}L110 ${y}V${y + 9}L-10 ${y + 31}Z" fill="${a(accent)}" fill-opacity=".85"/>`).join("") +
        `<path d="M104 ${A + 10}C120 ${A + 40} 128 ${A + 70} 124 ${A + 104}H146C150 ${A + 70} 140 ${A + 40} 124 ${A + 14}Z" fill="${a(accent)}" fill-opacity=".85"/>`;
    case "sparkle": {
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      return Array.from({ length: 26 }, () => {
        const x = rnd() * 220, y = legTop + rnd() * (bottom - legTop), s = 2 + rnd() * 3.5;
        return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="M0 ${-s * 1.8}L${s * 0.45} ${-s * 0.45}L${s * 1.8} 0L${s * 0.45} ${s * 0.45}L0 ${s * 1.8}L${-s * 0.45} ${s * 0.45}L${-s * 1.8} 0L${-s * 0.45} ${-s * 0.45}Z" fill="${a(rnd() > 0.5 ? accent : second)}"/>`;
      }).join("");
    }
    default:
      return "";
  }
}

/**
 * The sock's SVG markup (no <svg> wrapper). `id` must be unique on the page: it names the clip path and the
 * texture patterns.
 */
export function sockMarkup(spec: SockSpec, id: string): string {
  const top = TOP[spec.cut];
  const d = sockOutline(spec.cut);
  const { main, accent } = spec;
  const second = spec.second ?? "#f4efe4";
  const heel = spec.heel !== false;
  const sid = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const behind: string[] = [];
  const inside: string[] = [];
  const over: string[] = [];

  // Things that stick out of the outline are drawn behind it, so the sock's edge covers their base.
  if (spec.pattern === "bear") {
    for (const x of [16, 84]) behind.push(`<circle cx="${x}" cy="${top + 4}" r="17" fill="${a(main)}"/><circle cx="${x}" cy="${top + 2}" r="8.5" fill="${a(accent)}"/>`);
  }
  if (spec.pattern === "dino") {
    const from = spec.cut === "no-show" ? A + 40 : top + 10;
    behind.push(range(from, A + 70, 24).map((y) => `<path d="M2 ${y}L-17 ${y + 11}L2 ${y + 22}Z" fill="${a(accent)}" stroke="${a(accent)}" stroke-width="3" stroke-linejoin="round"/>`).join(""));
  }
  if (spec.lace && spec.cut !== "no-show") {
    behind.push(range(4, 100, 12).map((x) => `<circle cx="${x + 2}" cy="${top + 1}" r="8" fill="${a(second)}"/><circle cx="${x + 2}" cy="${top - 2}" r="2" fill="#000" fill-opacity=".12"/>`).join(""));
  }

  inside.push(pattern(spec, top));

  // Ribbed cuff.
  if (spec.cut === "no-show") {
    inside.push(`<path d="M-1 ${A + 44}C24 ${A + 30} 92 ${A + 26} 100 ${A + 22}" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="12"/>`);
  } else {
    inside.push(`<rect x="-10" y="${top}" width="120" height="28" fill="#000" fill-opacity=".09"/>` +
      range(3, 100, 6).map((x) => `<path d="M${x} ${top + 2}V${top + 27}" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>`).join(""));
  }

  if (heel) {
    inside.push(`<ellipse cx="16" cy="${A + 72}" rx="42" ry="44" fill="${a(accent)}"/>`);
    inside.push(`<ellipse cx="232" cy="${A + 66}" rx="46" ry="52" fill="${a(accent)}"/>`);
  }
  if (spec.toes) {
    inside.push(range(194, 232, 9).map((x) => `<path d="M${x} ${A + 30}C${x + 4} ${A + 60} ${x + 4} ${A + 80} ${x} ${A + 106}" fill="none" stroke="${a(main)}" stroke-width="2.4" stroke-opacity=".9"/>`).join(""));
  }
  if (spec.grip) {
    inside.push(range(36, 206, 13).map((x, i) => `<circle cx="${x}" cy="${A + 94 - (i % 2) * 4}" r="3.6" fill="${a(i % 2 ? second : accent)}" stroke="#000" stroke-opacity=".15"/>`).join(""));
  }

  // Knit texture and light.
  inside.push(`<rect x="-30" y="${top - 30}" width="290" height="${A + 140 - top}" fill="url(#k-${sid})"/>`);
  inside.push(`<rect x="-6" y="${top}" width="236" height="${A + 104 - top}" fill="url(#g-${sid})"/>`);
  if (spec.fluffy) inside.push(`<rect x="-30" y="${top - 30}" width="290" height="${A + 140 - top}" fill="url(#f-${sid})"/>`);

  if (spec.fluffy) over.push(`<path d="${d}" fill="none" stroke="${a(main)}" stroke-width="9" stroke-dasharray="0.1 8.5" stroke-linecap="round"/>`);
  over.push(`<path d="${d}" fill="none" stroke="#0b1220" stroke-opacity=".2" stroke-width="1.6" stroke-linejoin="round"/>`);

  const defs =
    `<defs>` +
    `<clipPath id="c-${sid}"><path d="${d}"/></clipPath>` +
    `<pattern id="k-${sid}" width="7" height="8" patternUnits="userSpaceOnUse"><path d="M0 0.5L3.5 6L7 0.5" fill="none" stroke="#000" stroke-opacity=".075" stroke-width="1.2"/></pattern>` +
    `<linearGradient id="g-${sid}" x1="0" x2="1" y1="0" y2="0.25"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>` +
    (spec.fluffy ? `<pattern id="f-${sid}" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#fff" fill-opacity=".35"/><circle cx="9.5" cy="8" r="1.1" fill="#fff" fill-opacity=".28"/></pattern>` : "") +
    `</defs>`;

  return defs + behind.join("") + `<path d="${d}" fill="${a(main)}"/>` +
    `<g clip-path="url(#c-${sid})">${inside.join("")}</g>` + over.join("");
}

/** A whole standalone SVG of one sock, sized to its bounds. */
export function sockSvg(spec: SockSpec, id: string, attrs = ""): string {
  const b = sockBounds(spec.cut);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" ${attrs}>${sockMarkup(spec, id)}</svg>`;
}

/** The shop's colourways, for illustrations. */
export const SOCK_COLOURS = {
  navy: "#1f2a44", black: "#23211d", grey: "#8a8d91", white: "#efece4", cream: "#e9dfc8", rose: "#d9a3a6",
  brick: "#9b4a3a", charcoal: "#4a4d52", brown: "#6b4a35", beige: "#cdb99a", pink: "#e7b4c4", mint: "#a7cbb8",
  gold: "#c9a24b", sky: "#8fb1cf", indigo: "#243a7a", red: "#b8323a", forest: "#2f5a46", mustard: "#d9a531",
  lilac: "#b9a7d6", coral: "#e9806e", olive: "#7b7d4a", oat: "#e4d6bd", sage: "#9db49c", denim: "#4f6d93",
} as const;
