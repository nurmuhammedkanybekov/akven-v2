/**
 * The AKVEN mark, drawn as vectors from the family's chosen design: a Roman A with a thin left leg and a wide right
 * leg that runs on into the V, a flag serif on the V, and a ribbon that rises from the A's foot, arches over the A
 * and falls into the V: Akyl and Venera, joined. A thin line along the ribbon keeps its folded look in one colour.
 * Where the ribbon passes over the A, a small gap shows which is in front.
 *
 * Plain TypeScript with no imports: the logo, icon and product image scripts run it under Node as well.
 * Units: the drawing's own (about 516 x 302).
 */

const ORIGIN = { x: 36, y: 42 };

const PARTS = {
  leftLeg: "M227 50L239 50L73 331H57Z",
  foot: "M40 334H114L109 328H45Z",
  rightLeg: "M229 47L258 172L300 245L384 334L400 340L411 333L246 47Z",
  vArm: "M400 340L409 333L523 152H512Z",
  flag: "M455 147H548L541 153H461Z",
  ribbon: "M95 303C147 222 205 180 258 180C303 181 336 213 358 255C374 287 388 317 402 338L370 333C350 300 327 268 302 243C278 220 258 211 236 212C182 217 136 255 106 307Z",
  /** The fold line inside the ribbon. */
  fold: "M110 293C166 219 225 192 261 192C301 194 333 221 351 254C365 281 377 305 391 327",
};

export const MARK = {
  viewBox: "0 0 516 302",
  w: 516,
  h: 302,
} as const;

/**
 * The mark's SVG markup (no <svg> wrapper), in one colour, placed in a 0 0 516 302 frame. `id` must be unique on the
 * page. The gaps are masks, so the background shows through them whatever the background is.
 */
export function markMarkup(fill: string, id: string): string {
  const sid = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeFill = fill.replace(/[&"<>]/g, "");
  const box = `x="0" y="0" width="620" height="420"`;
  return (
    `<defs>` +
    `<mask id="${sid}-over" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#fff"/><path d="${PARTS.ribbon}" fill="none" stroke="#000" stroke-width="7" stroke-linejoin="round"/></mask>` +
    `<mask id="${sid}-fold" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#fff"/><path d="${PARTS.fold}" fill="none" stroke="#000" stroke-width="3.2" stroke-linecap="round"/></mask>` +
    `</defs>` +
    `<g transform="translate(${-ORIGIN.x} ${-ORIGIN.y})" fill="${safeFill}">` +
    `<g mask="url(#${sid}-over)"><path d="${PARTS.leftLeg}"/><path d="${PARTS.rightLeg}"/></g>` +
    `<path d="${PARTS.foot}"/><path d="${PARTS.vArm}"/><path d="${PARTS.flag}"/>` +
    `<path d="${PARTS.ribbon}" mask="url(#${sid}-fold)"/>` +
    `</g>`
  );
}
