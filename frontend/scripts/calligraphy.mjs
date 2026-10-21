/**
 * A broad-nib pen for the logo's heart ampersand. The letter is described by its centreline (cubic Béziers in an em of
 * 100, baseline at y = 0, y down) and stroked by a flat nib held at a fixed angle, as a calligrapher writes: the
 * stroke is widest where it runs across the nib and a hairline where it runs along it. Each Bézier becomes its own
 * outline, all wound the same way, and the corners where one stroke turns into the next are filled as the nib would
 * fill them, so the result is a plain filled shape that needs no stroke support anywhere (print, embroidery, favicon).
 */

/** The heart: Akylbek and Venera, drawn from the dip down the left side, back up the right, and on out through itself
 * as the leg of the & with a little upturned flick at the end. */
export const HEART = [
  [[44, -52], [42, -66], [30, -74], [20, -72]],
  [[20, -72], [8, -70], [4, -56], [10, -44]],
  [[10, -44], [16, -30], [34, -16], [44, -2]],
  [[44, -2], [54, -16], [72, -30], [78, -44]],
  [[78, -44], [84, -56], [80, -70], [68, -72]],
  [[68, -72], [58, -74], [46, -66], [44, -52]],
  [[44, -52], [43, -38], [58, -12], [76, -2]],
  [[76, -2], [84, 2], [92, 2], [96, -6]],
];

const fx = (n) => +n.toFixed(2);

function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function anticlockwise(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; }
  return a < 0 ? poly.reverse() : poly;
}

/**
 * Strokes `segs` with the nib. scale/dx/dy place the letter (an em of 100 becomes `scale` units); w is the nib width,
 * min the hairline, angle the pen angle in degrees. The ends taper over the given fractions of the whole stroke.
 * Returns the filled outline and the centreline (for a "writing" animation that draws it with a mask).
 */
export function nib(segs, { scale = 1, dx = 0, dy = 0, w = 9.5, min = 1.8, angle = 45, taperIn = 0.04, taperOut = 0.1 } = {}) {
  const A = (angle * Math.PI) / 180, N = 40, k = scale / 100;
  const at = ([x, y]) => [dx + x * k, dy + y * k];
  const out = [];
  const emit = (poly) => out.push("M" + poly.map(([x, y]) => `${fx(x)} ${fx(y)}`).join("L") + "Z");
  let prev = null;
  segs.forEach(([p0, p1, p2, p3], si) => {
    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      let tx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
      let ty = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      let width = Math.max(min, w * Math.abs(Math.sin(Math.atan2(ty, tx) + A)));
      const g = (si + t) / segs.length;
      if (g < taperIn) width *= 0.35 + 0.65 * Math.sin((g / taperIn) * Math.PI / 2);
      if (g > 1 - taperOut) width *= 0.25 + 0.75 * Math.sin(((1 - g) / taperOut) * Math.PI / 2);
      const nx = (-ty * width) / 2, ny = (tx * width) / 2;
      L.push(at([x + nx, y + ny])); R.push(at([x - nx, y - ny]));
    }
    if (prev) emit(anticlockwise(hull([prev[0], prev[1], L[0], R[0]])));
    prev = [L[N], R[N]];
    emit(anticlockwise([...L, ...R.slice().reverse()]));
  });
  const line = "M" + at(segs[0][0]).map(fx).join(" ") + segs.map(([, a, b, c]) => "C" + [a, b, c].map((p) => at(p).map(fx).join(" ")).join(" ")).join("");
  return { d: out.join(""), line };
}
