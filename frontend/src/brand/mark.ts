/**
 * The AKVEN mark: A and V share their middle stroke, like one knitted stitch, and a thread runs from the A's crossbar
 * into the V: Akyl and Venera, joined. Pointed apex above, pointed vertex below, a thick shared stroke and thin outer
 * arms. Where the thread crosses the shared stroke, a thin gap lets it pass over.
 *
 * Built from a few numbers instead of a traced picture, so it stays crisp at 16 px and on a knitting machine.
 * Plain TypeScript with no imports: the logo, icon and product image scripts run it under Node as well.
 */

type Pt = [number, number];

function intersect(p: Pt, d: Pt, q: Pt, e: Pt): Pt {
  const den = d[0] * e[1] - d[1] * e[0];
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}

const r = (n: number) => +n.toFixed(2);

/** The A and V as one outline. Units: a 120 x 100 box (cap height about 8 to 92). */
function monogram(): string {
  const P: Pt = [44, 3];     // apex of the A
  const Q: Pt = [70, 97];    // vertex of the V
  const L0: Pt = [3, 92];    // outer foot of the A
  const R0: Pt = [117, 8];   // outer top of the V
  const thick = 17, thin = 7;
  const dS: Pt = [Q[0] + thick - P[0], Q[1] - P[1]];
  const dL: Pt = [P[0] - L0[0], P[1] - L0[1]];
  const dR: Pt = [R0[0] - Q[0], R0[1] - Q[1]];
  const ai = intersect([L0[0] + thin, L0[1]], dL, Q, dS);       // inside corner of the A
  const vi = intersect([R0[0] - thin, R0[1]], dR, P, dS);       // inside corner of the V
  const pts: Pt[] = [L0, P, vi, [R0[0] - thin, R0[1]], R0, Q, ai, [L0[0] + thin, L0[1]]];
  return "M" + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join("L") + "Z";
}

export const MARK = {
  viewBox: "-1 1 122 98",
  w: 122,
  h: 98,
  letters: monogram(),
  /** The thread: the A's crossbar flowing into the V. */
  thread: "M21 61C37 56 49 63 62 58S85 41 98 31C89 45 77 62 63 66S39 64 23 68Z",
  /** Where the thread crosses the shared stroke, the stroke is cut back by this much on each side. */
  gap: 2.5,
  gapZone: { x: 38, w: 42 },
} as const;

/**
 * The mark's SVG markup (no <svg> wrapper), in one colour. `id` must be unique on the page. The gap is a mask, so the
 * background shows through it whatever the background is.
 */
export function markMarkup(fill: string, id: string): string {
  const sid = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFill = fill.replace(/[&"<>]/g, "");
  return (
    `<defs><clipPath id="${sid}-z"><rect x="${MARK.gapZone.x}" y="0" width="${MARK.gapZone.w}" height="100"/></clipPath>` +
    `<mask id="${sid}-m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="120"><rect x="-10" y="-10" width="140" height="120" fill="#fff"/>` +
    `<path d="${MARK.thread}" fill="none" stroke="#000" stroke-width="${MARK.gap * 2}" stroke-linejoin="round" clip-path="url(#${sid}-z)"/></mask></defs>` +
    `<g fill="${safeFill}"><path d="${MARK.letters}" mask="url(#${sid}-m)"/><path d="${MARK.thread}"/></g>`
  );
}
