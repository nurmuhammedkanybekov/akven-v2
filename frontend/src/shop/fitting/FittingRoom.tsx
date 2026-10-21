import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSizeChart, listProducts } from "../../api/endpoints";
import type { Category, ProductSummary, SizeRow } from "../../api/types";
import { SOCK_COLOURS as C, SockArt, type SockCut, type SockSpec } from "../../brand/SockArt";
import { sockMarkup, sockOutline, sockTop } from "../../brand/sockDrawing";
import { Button } from "../../components/Button";
import { Price } from "../../components/Price";
import { ProductImage } from "../../components/ProductImage";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { loadSockSpecs, specFor, type SockSpecs } from "./specs";
import { categoryFor, useFamily } from "../family";

export const CUTS: SockCut[] = ["no-show", "ankle", "crew", "mid-long", "knee-high"];
export type Shoe = "bare" | "trainers" | "oxfords" | "loafers" | "boots";
export const SHOE_LIST: Shoe[] = ["trainers", "oxfords", "loafers", "boots", "bare"];
type Who = Exclude<Category, "BUNDLES">;
const WHO: Who[] = ["MEN", "WOMEN", "KIDS"];
const SKIN = ["#f1d3bf", "#dfb08f", "#b9805d", "#7e5039"];
/** Trouser colours people wear most; the drawn trousers take the one chosen. */
export const TROUSERS: Array<{ key: string; hex: string }> = [
  { key: "navy", hex: "#2d3b57" }, { key: "charcoal", hex: "#3d4046" }, { key: "black", hex: "#1f1e1c" }, { key: "grey", hex: "#8a8d93" },
  { key: "denim", hex: "#4f6d93" }, { key: "beige", hex: "#c2ab82" }, { key: "brown", hex: "#5d4331" }, { key: "olive", hex: "#6a6b45" },
];
function rgb(hex: string) { const n = parseInt(hex.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
/** How far apart two colours look (a weighted RGB distance, good enough for "goes with"). */
export function colourDistance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b), rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}
/** A sock colour "goes with" the trousers when it is close to them: the classic rule for dress socks. */
export const MATCH_DISTANCE = 140;
function shade(hex: string, by: number) { return "#" + rgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v + by))).toString(16).padStart(2, "0")).join(""); }

const SHOE_SIZES = Array.from({ length: 30 }, (_, i) => 18 + i);
const DEFAULT_SIZE: Record<Who, number> = { MEN: 42, WOMEN: 38, KIDS: 30 };

/**
 * How well a height goes with a pair of shoes: 2 = the right choice, 1 = works, 0 = better not. The usual advice of
 * shoe shops: no-shows stay hidden in loafers and trainers, dress shoes want a sock that covers the shin when you sit,
 * and a boot needs a sock taller than itself, or the boot rubs.
 */
export const FIT: Record<Shoe, Record<SockCut, 0 | 1 | 2>> = {
  trainers: { "no-show": 2, ankle: 2, crew: 2, "mid-long": 1, "knee-high": 1 },
  oxfords: { "no-show": 1, ankle: 0, crew: 2, "mid-long": 2, "knee-high": 1 },
  loafers: { "no-show": 2, ankle: 0, crew: 1, "mid-long": 1, "knee-high": 0 },
  boots: { "no-show": 0, ankle: 0, crew: 1, "mid-long": 2, "knee-high": 2 },
  bare: { "no-show": 1, ankle: 2, crew: 2, "mid-long": 2, "knee-high": 1 },
};

/** The house sock, for when the catalogue cannot be reached: navy with the oimo band. */
const HOUSE: SockSpec = { cut: "crew", main: C.navy, accent: C.gold, pattern: "oimo", second: C.cream };

/** The leg, the trousers rolled up above it, and a tailor's tape beside it, in the sock drawing's own space. */
const VIEW = { x: -40, y: -236, w: 290, h: 560 };
const LEG = `M2 -170H98V${sockTop("knee-high")}Z` + sockOutline("knee-high");

/**
 * Shoes drawn over the foot, in the same space. Each shoe's body is the foot itself (the knee-high outline, drawn a
 * little wider), cut off at the shoe's collar line, so it covers every sock exactly up to where a real shoe would and
 * nothing can peek through. The sole, laces and trims go on top.
 */
interface ShoeDrawing { colour: string; width: number; collar: string; trim: string }
const BELOW = "H280V340H-50Z";
const SHOES: Record<Exclude<Shoe, "bare">, ShoeDrawing> = {
  trainers: {
    colour: "#f4f1ea", width: 18,
    collar: "M-50 214H-2C14 208 40 212 62 220C80 226 96 222 108 210L124 202C138 212 150 220 162 222" + BELOW,
    trim: `<path d="M-6 214C14 208 40 212 62 220C80 226 96 222 108 210" fill="none" stroke="#1f2a44" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M14 282C60 268 120 260 178 268" fill="none" stroke="#c9a24b" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M128 214l10 -6M136 222l11 -6M145 228l11 -5" stroke="#1f2a44" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M-14 292H240C246 292 248 300 244 306C240 312 232 314 224 314H-6C-14 314-18 306-16 298Z" fill="#fff" stroke="#d9d3c7" stroke-width="2"/>` +
      `<path d="M-12 303H242" stroke="#d9d3c7" stroke-width="2"/>`,
  },
  oxfords: {
    colour: "#5a3824", width: 14,
    collar: "M-50 236H0C30 236 70 240 104 240C118 236 132 230 150 229" + BELOW,
    trim: `<path d="M150 236C176 240 204 250 222 266" fill="none" stroke="#3a2416" stroke-width="2" stroke-dasharray="3 3"/>` +
      `<path d="M14 262C60 254 120 252 180 258" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M112 242l14 -5M118 248l14 -5" stroke="#e9dfc8" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M-10 300H236C240 300 240 308 234 310H-8C-12 310-12 302-10 300Z" fill="#2b1d14"/><path d="M-8 308H40V316H-6Z" fill="#2b1d14"/>`,
  },
  loafers: {
    colour: "#7a4a2b", width: 14,
    collar: "M-50 252H-2C30 256 80 258 118 256C132 252 140 240 150 230" + BELOW,
    trim: `<path d="M134 258C152 250 178 252 200 262" fill="none" stroke="#4e2e1a" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M10 278C60 272 120 270 176 276" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M-10 300H236C240 300 240 308 234 310H-8C-12 310-12 302-10 300Z" fill="#2e1d12"/><path d="M-8 308H34V315H-6Z" fill="#2e1d12"/>`,
  },
  boots: {
    colour: "#8b6b4a", width: 22,
    collar: "M-50 118" + BELOW,
    trim: `<path d="M60 118C62 160 66 192 82 216L104 210C94 186 92 156 92 118Z" fill="#3f342b"/>` +
      `<path d="M-8 118H20V100C20 96 16 94 12 94H0C-4 94-8 96-8 100Z" fill="#6f5338"/>` +
      `<path d="M4 140C6 190 10 240 20 280" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M-14 302H238C242 302 242 312 236 314H-12C-16 314-16 304-14 302Z" fill="#2b2119"/>`,
  },
};
const FOOT = sockOutline("knee-high");
function shoeMarkup(shoe: Exclude<Shoe, "bare">, id: string): string {
  const d = SHOES[shoe];
  return `<clipPath id="${id}-shoe"><path d="${d.collar}"/></clipPath>` +
    `<g clip-path="url(#${id}-shoe)"><path d="${FOOT}" fill="${d.colour}" stroke="${d.colour}" stroke-width="${d.width}" stroke-linejoin="round"/>` +
    `<path d="${FOOT}" fill="url(#${id}-skin)" opacity=".7"/></g>` + d.trim;
}

/** The leg on the right of the fitting room: skin, trousers, the sock as drawn for the shop, and the shoe. */
function Stage({ spec, shoe, skin, cut, shoesOn, trousers }: { spec: SockSpec; shoe: Shoe; skin: string; cut: SockCut; shoesOn: boolean; trousers: string }) {
  const { t } = useT();
  const id = `fr${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const sock = useMemo(() => sockMarkup(spec, id), [JSON.stringify(spec), id]);
  const pct = (y: number) => `${(((y - VIEW.y) / VIEW.h) * 100).toFixed(2)}%`;
  const ticks = useMemo(() => Array.from({ length: 46 }, (_, i) => -170 + i * 10), []);
  return (
    <div className="av-fr__stage">
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="av-fr__svg" role="img"
           aria-label={t("fr.stageLabel", { cut: t(`cut.${cut}` as MessageKey), shoe: t(`fr.shoe.${shoe}` as MessageKey) })}>
        <defs>
          <linearGradient id={`${id}-skin`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".16" /></linearGradient>
        </defs>
        <ellipse cx="112" cy="318" rx="150" ry="10" fill="#000" fillOpacity=".09" />
        {/* the tape measure */}
        <g className="av-fr__tape">
          <rect x="-36" y="-170" width="18" height="480" rx="2" />
          {ticks.map((y, i) => <path key={y} d={`M-36 ${y}h${i % 5 === 0 ? 9 : 5}`} />)}
        </g>
        <g>
          <path d={LEG} fill={skin} />
          <path d={LEG} fill={`url(#${id}-skin)`} />
          <circle cx="80" cy="186" r="7" fill="#000" fillOpacity=".05" />
        </g>
        <g key={`${cut}${spec.main}${spec.pattern}${spec.accent}`} className="av-fr__sock" dangerouslySetInnerHTML={{ __html: sock }} />
        {/* trousers, rolled up */}
        <path d="M2 -142H98V-128C70 -134 30 -134 2 -128Z" fill="#000" fillOpacity=".12" />
        <g className="av-fr__trousers" style={{ "--tr": trousers } as React.CSSProperties}>
          <path d="M-6 -236H106V-160H-6Z" fill={trousers} />
          <path d="M30 -236V-170M78 -236V-170" stroke={shade(trousers, -18)} strokeWidth="2" />
          <path d="M-10 -170H110V-142H-10Z" fill={shade(trousers, 16)} />
        </g>
        <path d="M-10 -170H110V-163H-10Z" fill="#000" fillOpacity=".14" />
        <path d="M-10 -150H110" stroke="#e9dfc8" strokeOpacity=".5" strokeWidth="1.6" strokeDasharray="4 4" />
        {shoe !== "bare" && shoesOn && <g key={shoe} className="av-fr__shoe" dangerouslySetInnerHTML={{ __html: shoeMarkup(shoe, id) }} />}
      </svg>
      <ol className="av-fr__marks" aria-hidden="true">
        {CUTS.map((c) => (
          <li key={c} className={c === cut ? "is-on" : undefined} style={{ top: pct(c === "no-show" ? sockTop(c) + 14 : sockTop(c)) }}>
            {t(`cut.${c}` as MessageKey)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The visitor's last choices, kept in this browser only, so the fitting room opens the way they left it. */
const FIT_KEY = "akven-fit";
interface Remembered { who: Who; shoe: Shoe; size: number; skin: string }
function remembered(): Partial<Remembered> {
  try {
    const v = JSON.parse(localStorage.getItem(FIT_KEY) ?? "{}") as Partial<Remembered>;
    return {
      who: WHO.includes(v.who as Who) ? v.who : undefined,
      shoe: SHOE_LIST.includes(v.shoe as Shoe) ? v.shoe : undefined,
      size: SHOE_SIZES.includes(v.size as number) ? v.size : undefined,
      skin: SKIN.includes(v.skin as string) ? v.skin : undefined,
    };
  } catch { return {}; }
}

/** One thing that can go on the leg: a sock from the shelf, or a sock from inside a gift box. */
interface Item { key: string; product: ProductSummary; colours: string[]; spec: (hex: string | null) => SockSpec; box?: boolean }

function sizeLabel(rows: SizeRow[], who: Who, size: number): SizeRow | undefined {
  const fits = rows.filter((r) => size >= r.eu.min && size <= r.eu.max);
  return who === "MEN" ? fits[fits.length - 1] : fits[0];
}

/**
 * The fitting room: choose who is trying on, the shoes, and a height, and the shop's own socks of that height are
 * pulled onto a leg, in their own colours and patterns, with the shoe over the foot so you see what shows and what
 * stays hidden. Every height is marked on a tailor's tape, rated for the chosen shoes, and the shoe size gives the
 * sock size from the shop's chart. Opens on a given product and colour from the product page.
 */
export function FittingRoom({ initial, onPick }: {
  initial?: { slug: string; cut: SockCut; hex?: string | null; category?: Category; product?: ProductSummary };
  /** When set (the dialog on a product page), choosing "see this pair" calls it instead of navigating. */
  onPick?: () => void;
}) {
  const { t, lang } = useT();
  const [saved] = useState(remembered);
  const [who, setWho] = useState<Who>(initial?.category && initial.category !== "BUNDLES" ? initial.category : saved.who ?? "MEN");
  const [shoe, setShoe] = useState<Shoe>(saved.shoe ?? "trainers");
  const [cut, setCut] = useState<SockCut>(initial?.cut ?? "crew");
  const [skin, setSkin] = useState(saved.skin ?? SKIN[1]);
  const [size, setSize] = useState(saved.who === who && saved.size ? saved.size : DEFAULT_SIZE[who]);
  useEffect(() => {
    try { localStorage.setItem(FIT_KEY, JSON.stringify({ who, shoe, size, skin })); } catch { /* private mode: nothing to remember */ }
  }, [who, shoe, size, skin]);
  const [specs, setSpecs] = useState<SockSpecs | null>(null);
  const [rows, setRows] = useState<SizeRow[]>([]);
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [boxes, setBoxes] = useState<ProductSummary[]>([]);
  const [shoesOn, setShoesOn] = useState(true);
  const [trousers, setTrousers] = useState(TROUSERS[0].hex);
  const family = useFamily();
  const [chosen, setChosen] = useState<{ key: string; hex: string | null } | null>(initial ? { key: initial.slug, hex: initial.hex ?? null } : null);

  useEffect(() => { loadSockSpecs().then(setSpecs).catch(() => setSpecs({})); }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    getSizeChart(lang, ctrl.signal).then((c) => setRows(c.rows)).catch(() => setRows([]));
    return () => ctrl.abort();
  }, [lang]);
  useEffect(() => {
    const ctrl = new AbortController();
    setProducts(null);
    const load = (category?: Category) => listProducts({ cut, category, inStock: true, pageSize: 12 }, ctrl.signal);
    load(who).then((p) => (p.items.length ? p : load())).then((p) => setProducts(p.items)).catch(() => setProducts([]));
    return () => ctrl.abort();
  }, [cut, who]);
  // The gift boxes, once: the socks inside them can be tried on too.
  useEffect(() => {
    const ctrl = new AbortController();
    listProducts({ category: "BUNDLES", pageSize: 24 }, ctrl.signal).then((p) => setBoxes(p.items)).catch(() => setBoxes([]));
    return () => ctrl.abort();
  }, []);

  // What can go on the leg at this height: the shop's socks we can draw (the sock a product page opened us on first,
  // even if the list would not reach it), then the socks of this height inside the gift boxes.
  const items = useMemo<Item[]>(() => {
    if (!specs) return [];
    const list = products ?? [];
    const own = initial?.product && cut === initial.cut && !list.some((p) => p.slug === initial.slug) ? [initial.product, ...list] : list;
    const socks: Item[] = own.filter((p) => specs[p.slug]?.s).map((p) => ({ key: p.slug, product: p, colours: p.colors, spec: (hex) => specFor(specs, p.slug, hex)! }));
    const inBoxes: Item[] = boxes.flatMap((p) => (specs[p.slug]?.b ?? []).flatMap((sp, i) => (sp.cut === cut
      ? [{ key: `${p.slug}#${i}`, product: p, colours: [], spec: () => sp, box: true }] : [])));
    return [...socks, ...inBoxes];
  }, [products, boxes, specs, cut, initial]);
  const current = items.find((it) => it.key === chosen?.key) ?? items[0];
  const hex = current && chosen?.key === current.key ? chosen.hex : current?.colours[0] ?? null;
  const spec: SockSpec = current ? { ...current.spec(hex), cut } : { ...HOUSE, cut };
  // Which of the socks on the rail go with the trousers, and the closest colour of each.
  const closest = (it: Item) => it.colours.reduce<{ hex: string | null; d: number }>((best, c) => {
    const d = colourDistance(c, trousers);
    return d < best.d ? { hex: c, d } : best;
  }, { hex: null, d: Infinity });
  function matchTrousers() {
    const ranked = items.map((it) => ({ it, ...closest(it) })).filter((x) => x.hex).sort((a, b) => a.d - b.d);
    if (ranked[0]) setChosen({ key: ranked[0].it.key, hex: ranked[0].hex });
  }
  const rating = FIT[shoe][cut];
  const best = CUTS.filter((c) => FIT[shoe][c] === 2);
  const row = rows.length ? sizeLabel(rows, who, size) : undefined;

  function pickWho(w: Who) { setWho(w); setSize(DEFAULT_SIZE[w]); }

  return (
    <div className="av-fr">
      <div className="av-fr__controls">
        <fieldset className="av-fr__step">
          <legend><b>1</b>{t("fr.who")}</legend>
          <div className="av-fr__chips">
            {WHO.map((w) => (
              <label key={w} className={`av-fr__chip${w === who ? " is-on" : ""}`}>
                <input type="radio" name="fr-who" checked={w === who} onChange={() => pickWho(w)} />
                <span>{t(`fr.who.${w}` as MessageKey)}</span>
              </label>
            ))}
          </div>
          {(family.members?.length ?? 0) > 0 && (
            <div className="av-fr__family">
              <span className="av-small av-muted">{t("fr.yourFamily")}</span>
              {family.members!.slice(0, 8).map((m) => (
                <button key={m.id} type="button" className="av-family__chip" onClick={() => { const w = categoryFor(m) as Who; setWho(w); setSize(m.shoeSize); }}>
                  {m.name || t(`family.${m.role}` as MessageKey)} · {m.shoeSize}
                </button>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset className="av-fr__step">
          <legend><b>2</b>{t("fr.shoes")}</legend>
          <div className="av-fr__chips">
            {SHOE_LIST.map((s) => (
              <label key={s} className={`av-fr__chip${s === shoe ? " is-on" : ""}`}>
                <input type="radio" name="fr-shoe" checked={s === shoe} onChange={() => setShoe(s)} />
                <span>{t(`fr.shoe.${s}` as MessageKey)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="av-fr__step">
          <legend><b>3</b>{t("fr.height")}</legend>
          <div className="av-fr__heights">
            {CUTS.map((c) => (
              <label key={c} className={`av-fr__height${c === cut ? " is-on" : ""}`} data-fit={FIT[shoe][c]}>
                <input type="radio" name="fr-cut" checked={c === cut} onChange={() => setCut(c)} />
                <span className="av-fr__hname">{t(`cut.${c}` as MessageKey)}</span>
                <span className="av-fr__hfit">{t(`fr.fit${FIT[shoe][c]}` as MessageKey)}</span>
              </label>
            ))}
          </div>
          <p className="av-fr__advice" aria-live="polite" data-fit={rating}>
            <strong>{t(`fr.verdict${rating}` as MessageKey, { cut: t(`cut.${cut}` as MessageKey), shoe: t(`fr.shoe.${shoe}` as MessageKey).toLowerCase() })}</strong>{" "}
            {t(`fr.tip.${shoe}` as MessageKey)}
            {rating < 2 && best.length > 0 && <> {t("fr.better", { list: best.map((c) => t(`cut.${c}` as MessageKey).toLowerCase()).join(", ") })}</>}
          </p>
        </fieldset>
        <fieldset className="av-fr__step">
          <legend><b>4</b>{t("fr.size")}</legend>
          <div className="av-fr__size">
            <label className="av-field">
              <span className="av-label">{t("fr.shoeSize")}</span>
              <select className="av-select" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {SHOE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <p className="av-fr__sizeout" aria-live="polite">
              {row ? <>{t("fr.sockSize")} <strong>{row.label}</strong> <span className="av-muted">({t("fr.footCm", { min: Number(row.footCm.min), max: Number(row.footCm.max) })})</span></>
                : rows.length ? t("fr.noSize") : null}
            </p>
          </div>
          <div className="av-fr__skins" role="radiogroup" aria-label={t("fr.skin")}>
            <span className="av-small av-muted">{t("fr.skin")}</span>
            {SKIN.map((s, i) => (
              <button key={s} type="button" role="radio" aria-checked={s === skin} aria-label={t("fr.skinN", { n: i + 1 })}
                      className="av-fr__skin" style={{ background: s }} onClick={() => setSkin(s)} />
            ))}
          </div>
        </fieldset>
        <fieldset className="av-fr__step">
          <legend><b>5</b>{t("fr.trousers")}</legend>
          <div className="av-fr__trouserpick" role="radiogroup" aria-label={t("fr.trousers")}>
            {TROUSERS.map((tr) => (
              <button key={tr.key} type="button" role="radio" aria-checked={tr.hex === trousers} aria-label={t(`fr.tr.${tr.key}` as MessageKey)} title={t(`fr.tr.${tr.key}` as MessageKey)}
                      className="av-fr__trouser" style={{ background: tr.hex }} onClick={() => setTrousers(tr.hex)} />
            ))}
          </div>
          <div className="av-row">
            <Button size="sm" variant="secondary" onClick={matchTrousers} disabled={!items.some((it) => it.colours.length)}>{t("fr.match")}</Button>
            <span className="av-small av-muted">{t(shoe === "oxfords" || shoe === "loafers" ? "fr.matchTipDress" : "fr.matchTipCasual")}</span>
          </div>
        </fieldset>
      </div>

      <div className="av-fr__room">
        <div className="av-fr__stagewrap">
          <Stage spec={spec} shoe={shoe} skin={skin} cut={cut} shoesOn={shoesOn} trousers={trousers} />
          {shoe !== "bare" && (
            <button type="button" className="av-fr__shoesbtn" aria-pressed={shoesOn} onClick={() => setShoesOn((v) => !v)}>
              <span className="av-fr__switch" aria-hidden="true" />{t(shoesOn ? "fr.shoesOn" : "fr.shoesOff")}
            </button>
          )}
        </div>
        <div className="av-fr__on">
          {current ? (
            <>
              <div className="av-fr__now">
                <span className="av-fr__tag">{current.box ? t("fr.fromBox") : t("fr.onTheLeg")}</span>
                <strong>{current.product.name}</strong>
                <Price amount={current.product.minPrice} from={current.product.variantCount > 1} />
              </div>
              {current.colours.length > 1 && (
                <div className="av-fr__colours" role="group" aria-label={t("pdp.colour")}>
                  {current.colours.slice(0, 8).map((c) => (
                    <button key={c} type="button" className="av-fr__dot" style={{ background: c }} aria-pressed={c === hex}
                            aria-label={t("fr.colourN", { hex: c })} onClick={() => setChosen({ key: current.key, hex: c })} />
                  ))}
                </div>
              )}
              <div className="av-row">
                <Button to={`/products/${current.product.slug}${hex ? `?colour=${encodeURIComponent(hex.replace("#", ""))}` : ""}`} size="sm" onClick={onPick}>{t(current.box ? "fr.seeBox" : "fr.see")}</Button>
                <Button to={`/shop?cut=${cut}`} size="sm" variant="ghost">{t("height.shop", { cut: t(`cut.${cut}` as MessageKey).toLowerCase() })}</Button>
              </div>
            </>
          ) : (
            <p className="av-small av-muted">{products === null || specs === null ? t("fr.loading") : t("fr.none")}</p>
          )}
        </div>
        {items.length > 1 && (
          <ul className="av-fr__rail" aria-label={t("fr.rail", { cut: t(`cut.${cut}` as MessageKey) })}>
            {items.map((it) => (
              <li key={it.key} className={it.box ? "is-box" : undefined}>
                <button type="button" aria-pressed={it.key === current?.key} onClick={() => setChosen({ key: it.key, hex: it.colours[0] ?? null })}>
                  <span className="av-fr__thumb">
                    {it.box ? <SockArt {...it.spec(null)} frame="knee-high" className="av-fr__thumbsock" /> : <ProductImage image={it.product.image ? { ...it.product.image, alt: "" } : null} />}
                    {!it.box && closest(it).d < MATCH_DISTANCE && <span className="av-fr__matchbadge" title={t("fr.matches")}>{t("fr.matches")}</span>}
                    {it.box && <span className="av-fr__boxbadge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C9 7 7 3 9.5 3S12 7 12 7Zm0 0c3 0 5-4 2.5-4S12 7 12 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg></span>}
                  </span>
                  <span className="av-fr__thumbname">{it.box ? t("fr.inBox", { box: it.product.name }) : it.product.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="av-small av-muted"><Link to="/sizes">{t("finder.chart")}</Link></p>
      </div>
    </div>
  );
}
