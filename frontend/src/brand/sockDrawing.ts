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
  | "oimo" | "bear" | "dino" | "compression" | "sparkle" | "snow"
  | "checker" | "gingham" | "houndstooth" | "zigzag" | "fairisle" | "camo" | "leopard" | "cherries" | "stars" | "moons"
  | "cable" | "tiedye" | "waves" | "ombre" | "colorblock" | "flowers" | "mountains" | "shyrdak" | "paws" | "football"
  | "rainbow" | "pixel" | "cat" | "bunny" | "lemons" | "skyline";

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
  /** A pom-pom at the back of the heel (no-show and ankle socks). */
  pompom?: boolean;
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
const STAR = "M0-7L2-2.2L7.2-2.2L3-1L4.6 6L0 2.6L-4.6 6L-3-1L-7.2-2.2L-2-2.2Z";
const PIXEL_HEART = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"];

/** A repeatable pseudo-random sequence, so the same sock is drawn the same way every time. */
function seeded(start: number): () => number {
  let seed = start;
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

/** Where a face or one big motif sits on the leg. */
function faceY(spec: SockSpec, legTop: number): number {
  return spec.cut === "no-show" ? A + 60 : Math.max(legTop + 30, Math.min(A - 40, (legTop + A) / 2));
}

/** Leg and foot decoration, drawn inside the sock's clip. */
function pattern(spec: SockSpec, top: number, sid: string): string {
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
      const m = faceY(spec, legTop);
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
    case "checker":
      return range(legTop - 4, bottom, 14).flatMap((y, r) => range(-10 + (r % 2) * 14, 240, 28).map((x) => `<rect x="${x}" y="${y}" width="14" height="14" fill="${a(accent)}"/>`)).join("");
    case "gingham":
      return range(legTop - 4, bottom, 24).map((y) => `<rect x="-10" y="${y}" width="250" height="12" fill="${a(accent)}" fill-opacity=".45"/>`).join("") +
        range(-10, 240, 24).map((x) => `<rect x="${x}" y="${legTop - 4}" width="12" height="${bottom - legTop + 4}" fill="${a(accent)}" fill-opacity=".45"/>`).join("");
    case "houndstooth":
      return range(legTop - 6, bottom, 16).flatMap((y) => range(-10, 240, 16).map((x) =>
        `<path transform="translate(${x} ${y})" d="M0 0H8L16 8H12L8 4V8L12 12V16L4 8H0Z" fill="${a(accent)}"/>`)).join("");
    case "zigzag":
      return range(legTop, bottom, 18).map((y, i) =>
        `<path d="M-12 ${y}${range(-12, 250, 16).map((x) => `L${x + 8} ${y + 8}L${x + 16} ${y}`).join("")}" fill="none" stroke="${a(i % 2 ? second : accent)}" stroke-width="5"/>`).join("");
    case "fairisle": {
      // A Nordic yoke: a wide band of small crosses between rows of dots, and a narrow band of diamonds lower down.
      const band = (y: number) =>
        `<rect x="-10" y="${y}" width="250" height="44" fill="${a(accent)}"/>` +
        range(-4, 240, 8).map((x) => `<circle cx="${x}" cy="${y + 5}" r="1.8" fill="${a(second)}"/><circle cx="${x + 4}" cy="${y + 39}" r="1.8" fill="${a(second)}"/>`).join("") +
        range(4, 240, 20).map((x) => `<path d="M${x} ${y + 14}V${y + 30}M${x - 8} ${y + 22}H${x + 8}" stroke="${a(second)}" stroke-width="3.2"/><path d="M${x + 10} ${y + 18}L${x + 14} ${y + 22}L${x + 10} ${y + 26}L${x + 6} ${y + 22}Z" fill="${a(second)}"/>`).join("");
      const small = (y: number) => `<path d="M-10 ${y}H240" stroke="${a(accent)}" stroke-width="2"/>` +
        range(-6, 240, 12).map((x) => `<path d="M${x} ${y + 3}L${x + 5} ${y + 8}L${x} ${y + 13}L${x - 5} ${y + 8}Z" fill="${a(accent)}"/>`).join("") +
        `<path d="M-10 ${y + 16}H240" stroke="${a(accent)}" stroke-width="2"/>`;
      if (spec.cut === "no-show") return small(A + 34);
      return band(legTop + 2) + (A - legTop > 110 ? small(legTop + 64) : "") + small(A + 62);
    }
    case "camo": {
      const rnd = seeded(11);
      const tones = [accent, second, "#000"];
      return Array.from({ length: 34 }, (_, i) => {
        const x = rnd() * 240 - 10, y = legTop - 10 + rnd() * (bottom - legTop + 10), rx = 9 + rnd() * 14, ry = 6 + rnd() * 9;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${Math.round(rnd() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${a(tones[i % 3])}" fill-opacity="${i % 3 === 2 ? 0.22 : 0.9}"/>`;
      }).join("");
    }
    case "leopard": {
      const rnd = seeded(5);
      return range(legTop, bottom, 26).flatMap((y, r) => range(r % 2 ? 4 : 18, 236, 30).map((x) => {
        const jx = x + rnd() * 8 - 4, jy = y + rnd() * 8 - 4, w = 7 + rnd() * 3;
        return `<ellipse cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" rx="${w.toFixed(1)}" ry="${(w * 0.75).toFixed(1)}" fill="${a(second)}"/>` +
          `<ellipse cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" rx="${(w + 2).toFixed(1)}" ry="${(w * 0.75 + 2).toFixed(1)}" fill="none" stroke="${a(accent)}" stroke-width="3" stroke-dasharray="7 4" stroke-linecap="round"/>`;
      })).join("");
    }
    case "cherries":
      return range(legTop + 8, bottom, 34).flatMap((y, r) => range(r % 2 ? 12 : 40, 236, 50).map((x) =>
        `<g transform="translate(${x} ${y})"><path d="M-5 6C-4-2 0-8 5-11M5 6C4-1 4-6 5-11" stroke="#4d6b3c" stroke-width="1.8" fill="none"/>` +
        `<path d="M5-11C9-14 14-12 15-9C11-8 8-9 5-11Z" fill="#5f8a4a"/><circle cx="-5" cy="9" r="5.2" fill="${a(accent)}"/><circle cx="5" cy="9" r="5.2" fill="${a(accent)}"/>` +
        `<circle cx="-6.5" cy="7.5" r="1.4" fill="#fff" fill-opacity=".6"/><circle cx="3.5" cy="7.5" r="1.4" fill="#fff" fill-opacity=".6"/></g>`)).join("");
    case "stars":
      return range(legTop + 6, bottom, 26).flatMap((y, r) => range(r % 2 ? 6 : 22, 236, 32).map((x, i) =>
        `<path transform="translate(${x} ${y}) scale(${(i + r) % 3 ? 1 : 0.7})" d="${STAR}" fill="${a((i + r) % 4 ? accent : second)}"/>`)).join("");
    case "moons":
      return range(legTop + 10, bottom, 34).flatMap((y, r) => range(r % 2 ? 10 : 34, 236, 48).map((x, i) => i % 2
        ? `<path transform="translate(${x} ${y})" d="M2-8A8 8 0 1 0 8 4A6.2 6.2 0 1 1 2-8Z" fill="${a(accent)}"/>`
        : `<path transform="translate(${x} ${y}) scale(.55)" d="${STAR}" fill="${a(second)}"/><circle cx="${x + 16}" cy="${y + 10}" r="1.4" fill="${a(second)}"/>`)).join("");
    case "cable": {
      // Cable knit: twisted ropes running down the leg, shaded like raised stitches.
      const rope = (x: number) => range(legTop - 4, A + 10, 24).map((y) =>
        `<path d="M${x - 8} ${y}C${x - 8} ${y + 10} ${x + 8} ${y + 14} ${x + 8} ${y + 24}" fill="none" stroke="#000" stroke-opacity=".24" stroke-width="8"/>` +
        `<path d="M${x + 8} ${y}C${x + 8} ${y + 10} ${x - 8} ${y + 14} ${x - 8} ${y + 24}" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="7"/>`).join("");
      return [22, 78].map(rope).join("") +
        [50].map((x) => `<path d="M${x} ${legTop}V${A + 6}" stroke="#000" stroke-opacity=".12" stroke-width="3" stroke-dasharray="3 3"/>`).join("") +
        range(-4, 100, 7).filter((x) => x < 10 || x > 90).map((x) => `<path d="M${x} ${legTop}V${A}" stroke="#000" stroke-opacity=".1" stroke-width="2.2"/>`).join("");
    }
    case "tiedye": {
      const colours = [accent, second, spec.main];
      return range(20, 330, 18).reverse().map((r, i) =>
        `<circle cx="70" cy="${A - 10}" r="${r}" fill="none" stroke="${a(colours[i % 3])}" stroke-width="13" stroke-opacity=".75"/>`).join("");
    }
    case "waves":
      return range(legTop + 4, bottom, 16).map((y, i) =>
        `<path d="M-12 ${y}${range(-12, 250, 24).map((x) => `Q${x + 6} ${y - 6} ${x + 12} ${y}T${x + 24} ${y}`).join("")}" fill="none" stroke="${a(i % 3 === 2 ? second : accent)}" stroke-width="3"/>`).join("");
    case "ombre":
      return `<linearGradient id="o-${sid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${a(accent)}" stop-opacity="0"/><stop offset="1" stop-color="${a(accent)}"/></linearGradient>` +
        `<rect x="-10" y="${legTop}" width="250" height="${bottom - legTop}" fill="url(#o-${sid})"/>`;
    case "colorblock": {
      const split = spec.cut === "no-show" ? A + 50 : Math.round((legTop + A) / 2);
      return `<rect x="-10" y="${split}" width="250" height="${bottom - split}" fill="${a(accent)}"/><rect x="-10" y="${split - 6}" width="250" height="6" fill="${a(second)}"/>`;
    }
    case "flowers":
      return range(legTop + 12, bottom, 32).flatMap((y, r) => range(r % 2 ? 12 : 36, 236, 46).map((x) =>
        `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((deg) => `<ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(${deg})" fill="${a(second)}"/>`).join("")}<circle r="3.4" fill="${a(accent)}"/></g>`)).join("");
    case "mountains": {
      // Ala-Too: a row of peaks with snow caps across the lower leg.
      const base = spec.cut === "no-show" ? A + 60 : Math.min(A + 4, legTop + 90);
      const peaks = range(-20, 250, 40);
      return `<path d="M-20 ${base}${peaks.map((x, i) => `L${x + 20} ${base - (i % 2 ? 30 : 44)}L${x + 40} ${base}`).join("")}V${bottom}H-20Z" fill="${a(accent)}"/>` +
        peaks.map((x, i) => { const h = i % 2 ? 30 : 44; return `<path d="M${x + 20} ${base - h}L${x + 29} ${base - h + 13}L${x + 24} ${base - h + 10}L${x + 20} ${base - h + 15}L${x + 16} ${base - h + 10}L${x + 11} ${base - h + 13}Z" fill="${a(second)}"/>`; }).join("") +
        (spec.cut === "no-show" ? "" : `<circle cx="74" cy="${base - 66}" r="9" fill="${a(second)}" fill-opacity=".85"/>`);
    }
    case "shyrdak": {
      // The ram's-horn curl of Kyrgyz shyrdak felt carpets, in a band with a contrast border.
      const horn = (x: number, y: number) =>
        `<path transform="translate(${x} ${y}) scale(1.45)" d="M-13 7C-13-5-2-9 0 1C2-9 13-5 13 7M-13 7C-19 7-19-1-13-1M13 7C19 7 19-1 13-1M0 1V11" fill="none" stroke="${a(second)}" stroke-width="2.6" stroke-linecap="round"/>`;
      const band = (y: number) => `<rect x="-10" y="${y}" width="250" height="48" fill="${a(accent)}"/>` +
        `<path d="M-10 ${y + 3}H240M-10 ${y + 45}H240" stroke="${a(second)}" stroke-width="2" stroke-dasharray="6 3"/>` +
        range(8, 240, 46).map((x) => horn(x, y + 20)).join("");
      const ys = spec.cut === "no-show" ? [A + 36] : [legTop + 2, ...(A - legTop > 150 ? [A - 56] : [])];
      return ys.map(band).join("");
    }
    case "paws":
      return range(legTop + 8, bottom, 30).flatMap((y, r) => range(r % 2 ? 10 : 32, 236, 44).map((x, i) =>
        `<g transform="translate(${x} ${y}) rotate(${(i + r) % 2 ? -18 : 14})" fill="${a(accent)}"><ellipse cy="4" rx="6" ry="5"/><circle cx="-6.5" cy="-3" r="2.3"/><circle cx="-2.3" cy="-6.5" r="2.3"/><circle cx="2.3" cy="-6.5" r="2.3"/><circle cx="6.5" cy="-3" r="2.3"/></g>`)).join("");
    case "football":
      return range(legTop + 12, bottom, 36).flatMap((y, r) => range(r % 2 ? 14 : 40, 236, 52).map((x) =>
        `<g transform="translate(${x} ${y})"><circle r="10" fill="${a(second)}" stroke="#1b1d26" stroke-width="1.4"/><path d="M0-4L3.8-1.2L2.4 3.2H-2.4L-3.8-1.2Z" fill="#1b1d26"/><path d="M0-4V-10M3.8-1.2L9.5-3M2.4 3.2L5.8 8M-2.4 3.2L-5.8 8M-3.8-1.2L-9.5-3" stroke="#1b1d26" stroke-width="1.2"/></g>`)).join("");
    case "rainbow": {
      const bands = ["#c8553d", "#e9806e", "#d9a531", "#9db49c", "#8fb1cf", "#b9a7d6"];
      const from = spec.cut === "no-show" ? A + 30 : legTop;
      return bands.map((c, i) => `<rect x="-10" y="${from + i * 9}" width="250" height="9" fill="${c}"/>`).join("");
    }
    case "pixel":
      return range(legTop + 4, bottom, 30).flatMap((y, r) => range(r % 2 ? 4 : 28, 236, 48).map((x) =>
        PIXEL_HEART.flatMap((row, j) => [...row].map((on, k) => on === "1" ? `<rect x="${x + k * 3}" y="${y + j * 3}" width="3" height="3" fill="${a(accent)}"/>` : "")).join(""))).join("");
    case "cat": {
      const m = faceY(spec, legTop);
      return `<circle cx="34" cy="${m}" r="4.5" fill="#1b1d26"/><circle cx="66" cy="${m}" r="4.5" fill="#1b1d26"/>` +
        `<circle cx="35.4" cy="${m - 1.4}" r="1.4" fill="#fff"/><circle cx="67.4" cy="${m - 1.4}" r="1.4" fill="#fff"/>` +
        `<path d="M46 ${m + 9}H54L50 ${m + 13}Z" fill="#f08ca0"/>` +
        `<path d="M50 ${m + 13}Q46 ${m + 19} 42 ${m + 16}M50 ${m + 13}Q54 ${m + 19} 58 ${m + 16}" stroke="#1b1d26" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
        `<path d="M20 ${m + 8}H34M20 ${m + 14}L34 ${m + 12}M66 ${m + 8}H80M66 ${m + 12}L80 ${m + 14}" stroke="${a(second)}" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    case "bunny": {
      const m = faceY(spec, legTop);
      return `<ellipse cx="50" cy="${m + 14}" rx="18" ry="12" fill="${a(second)}"/>` +
        `<circle cx="36" cy="${m}" r="4.2" fill="#1b1d26"/><circle cx="64" cy="${m}" r="4.2" fill="#1b1d26"/>` +
        `<circle cx="37.3" cy="${m - 1.3}" r="1.3" fill="#fff"/><circle cx="65.3" cy="${m - 1.3}" r="1.3" fill="#fff"/>` +
        `<ellipse cx="50" cy="${m + 8}" rx="4" ry="3" fill="#f08ca0"/><path d="M50 ${m + 11}V${m + 16}M46 ${m + 16}H54" stroke="#1b1d26" stroke-width="1.6" stroke-linecap="round"/>` +
        `<path d="M47 ${m + 16}V${m + 21}H53V${m + 16}" fill="#fff" stroke="#1b1d26" stroke-width="1.2"/>`;
    }
    case "lemons":
      return range(legTop + 10, bottom, 32).flatMap((y, r) => range(r % 2 ? 12 : 38, 236, 50).map((x, i) =>
        `<g transform="translate(${x} ${y}) rotate(${(i + r) % 2 ? -25 : 20})"><path d="M-11 0C-11-8 11-8 11 0C11 8-11 8-11 0Z" fill="${a(accent)}"/><path d="M11 0L14 0M-11 0L-14 0" stroke="${a(accent)}" stroke-width="3" stroke-linecap="round"/><path d="M-2-7C2-12 8-12 10-10C6-7 2-7-2-7Z" fill="${a(second)}"/></g>`)).join("");
    case "skyline": {
      // A city at night along the foot and lower leg: blocks of buildings with lit windows.
      const ground = spec.cut === "no-show" ? A + 70 : Math.min(A + 10, legTop + 100);
      const rnd = seeded(3);
      let x = -12;
      const out: string[] = [];
      while (x < 240) {
        const w = 14 + Math.round(rnd() * 12), h = 22 + Math.round(rnd() * 46);
        out.push(`<rect x="${x}" y="${ground - h}" width="${w}" height="${bottom - ground + h}" fill="${a(accent)}"/>`);
        for (let wy = ground - h + 5; wy < ground - 4; wy += 8) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (rnd() > 0.45) out.push(`<rect x="${wx}" y="${wy}" width="2.6" height="3.4" fill="${a(second)}"/>`);
        x += w + 1;
      }
      return out.join("");
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
  if (spec.pattern === "cat") {
    for (const x of [14, 86]) behind.push(`<path d="M${x - 16} ${top + 14}L${x} ${top - 18}L${x + 16} ${top + 14}Z" fill="${a(main)}" stroke="${a(main)}" stroke-width="4" stroke-linejoin="round"/><path d="M${x - 8} ${top + 8}L${x} ${top - 8}L${x + 8} ${top + 8}Z" fill="${a(accent)}"/>`);
  }
  if (spec.pattern === "bunny") {
    for (const [x, tilt] of [[26, -12], [74, 12]] as const) behind.push(`<g transform="rotate(${tilt} ${x} ${top + 6})"><ellipse cx="${x}" cy="${top - 18}" rx="11" ry="30" fill="${a(main)}"/><ellipse cx="${x}" cy="${top - 16}" rx="5.5" ry="22" fill="${a(accent)}"/></g>`);
  }
  if (spec.lace && spec.cut !== "no-show") {
    behind.push(range(4, 100, 12).map((x) => `<circle cx="${x + 2}" cy="${top + 1}" r="8" fill="${a(second)}"/><circle cx="${x + 2}" cy="${top - 2}" r="2" fill="#000" fill-opacity=".12"/>`).join(""));
  }

  inside.push(pattern(spec, top, sid));

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

  if (spec.pompom) {
    const py = spec.cut === "no-show" ? A + 40 : TOP[spec.cut] + 8;
    const px = spec.cut === "no-show" ? -4 : -2;
    over.push(`<circle cx="${px}" cy="${py}" r="14" fill="${a(accent)}"/><circle cx="${px}" cy="${py}" r="14" fill="url(#f-${sid})"/>` +
      `<circle cx="${px}" cy="${py}" r="14" fill="none" stroke="${a(accent)}" stroke-width="6" stroke-dasharray="0.1 5" stroke-linecap="round"/>`);
  }
  if (spec.fluffy) over.push(`<path d="${d}" fill="none" stroke="${a(main)}" stroke-width="9" stroke-dasharray="0.1 8.5" stroke-linecap="round"/>`);
  over.push(`<path d="${d}" fill="none" stroke="#0b1220" stroke-opacity=".2" stroke-width="1.6" stroke-linejoin="round"/>`);

  const defs =
    `<defs>` +
    `<clipPath id="c-${sid}"><path d="${d}"/></clipPath>` +
    `<pattern id="k-${sid}" width="7" height="8" patternUnits="userSpaceOnUse"><path d="M0 0.5L3.5 6L7 0.5" fill="none" stroke="#000" stroke-opacity=".075" stroke-width="1.2"/></pattern>` +
    `<linearGradient id="g-${sid}" x1="0" x2="1" y1="0" y2="0.25"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>` +
    (spec.fluffy || spec.pompom ? `<pattern id="f-${sid}" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#fff" fill-opacity=".35"/><circle cx="9.5" cy="8" r="1.1" fill="#fff" fill-opacity=".28"/></pattern>` : "") +
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
  teal: "#2f7c7a", plum: "#6d3b5c", burgundy: "#6e2232", lemon: "#e8d36a", peach: "#efc0a0", camel: "#b08d57",
  khaki: "#a59a72", ink: "#151b2e", slate: "#5b6b7a", orange: "#d9772f", berry: "#9c2f5d", ice: "#d8e6ee",
  ivory: "#f6f1e6", moss: "#56663d", terracotta: "#c0643f", blush: "#f0d2cf",
} as const;
