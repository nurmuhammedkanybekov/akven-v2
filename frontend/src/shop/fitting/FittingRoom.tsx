import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSizeChart, listProducts } from "../../api/endpoints";
import type { Category, ProductSummary, SizeRow } from "../../api/types";
import { SOCK_COLOURS as C, type SockCut, type SockSpec } from "../../brand/SockArt";
import { sockMarkup, sockOutline, sockTop } from "../../brand/sockDrawing";
import { Button } from "../../components/Button";
import { Price } from "../../components/Price";
import { ProductImage } from "../../components/ProductImage";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { loadSockSpecs, specFor, type SockSpecs } from "./specs";

export const CUTS: SockCut[] = ["no-show", "ankle", "crew", "mid-long", "knee-high"];
export type Shoe = "bare" | "trainers" | "oxfords" | "loafers" | "boots";
export const SHOE_LIST: Shoe[] = ["trainers", "oxfords", "loafers", "boots", "bare"];
type Who = Exclude<Category, "BUNDLES">;
const WHO: Who[] = ["MEN", "WOMEN", "KIDS"];
const SKIN = ["#f1d3bf", "#dfb08f", "#b9805d", "#7e5039"];
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

/** Shoes drawn over the foot, in the same space: what stays hidden inside one is hidden on screen too. */
const SHOES: Record<Exclude<Shoe, "bare">, string> = {
  trainers:
    `<path d="M-8 296C-12 270-10 236-2 214C14 210 40 214 62 222C80 228 96 224 108 212L122 206C130 214 140 224 156 230C186 238 214 246 232 264C242 276 242 290 236 298Z" fill="#f4f1ea"/>` +
    `<path d="M-2 214C14 210 40 214 62 222C80 228 96 224 108 212" fill="none" stroke="#1f2a44" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M14 282C60 268 120 260 178 268" fill="none" stroke="#c9a24b" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M128 218l10 -6M136 226l11 -6M145 232l11 -5" stroke="#1f2a44" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M-12 292H238C244 292 246 300 242 306C238 312 230 314 222 314H-4C-12 314-16 306-14 298Z" fill="#fff" stroke="#d9d3c7" stroke-width="2"/>` +
    `<path d="M-10 303H240" stroke="#d9d3c7" stroke-width="2"/>`,
  oxfords:
    `<path d="M-6 298C-10 276-8 250 0 234C30 236 70 240 104 240C118 238 132 236 146 238C178 242 212 252 230 270C240 282 238 294 230 300Z" fill="#5a3824"/>` +
    `<path d="M150 241C176 246 204 256 222 270" fill="none" stroke="#3a2416" stroke-width="2" stroke-dasharray="3 3"/>` +
    `<path d="M14 262C60 254 120 252 180 258" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="M112 244l14 -4M118 250l14 -4" stroke="#e9dfc8" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M-8 298H232C236 298 236 306 230 308H-6C-10 308-10 300-8 298Z" fill="#2b1d14"/><path d="M-6 306H40V315H-4Z" fill="#2b1d14"/>`,
  loafers:
    `<path d="M-6 298C-10 282-8 264-2 252C30 256 80 258 120 256C150 254 190 256 220 268C238 278 240 292 232 300Z" fill="#7a4a2b"/>` +
    `<path d="M128 266C150 261 178 262 200 270" fill="none" stroke="#4e2e1a" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M10 276C60 270 120 268 176 274" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M-8 298H232C236 298 236 306 230 308H-6C-10 308-10 300-8 298Z" fill="#2e1d12"/><path d="M-6 306H34V313H-4Z" fill="#2e1d12"/>`,
  boots:
    `<path d="M-8 300C-10 250-8 170-4 118H104C104 160 108 196 124 222C160 238 210 248 230 268C240 280 240 294 232 302Z" fill="#8b6b4a"/>` +
    `<path d="M58 118C60 160 64 192 80 216L100 212C92 186 90 156 90 118Z" fill="#3f342b"/>` +
    `<path d="M-4 118H22V100C22 96 18 94 14 94H2C-2 94-4 96-4 100Z" fill="#6f5338"/>` +
    `<path d="M4 140C6 190 10 240 20 280" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="M-10 300H234C238 300 238 310 232 312H-8C-12 312-12 302-10 300Z" fill="#2b2119"/>`,
};

/** The leg on the right of the fitting room: skin, trousers, the sock as drawn for the shop, and the shoe. */
function Stage({ spec, shoe, skin, cut }: { spec: SockSpec; shoe: Shoe; skin: string; cut: SockCut }) {
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
        <path d="M-6 -236H106V-160H-6Z" fill="#2d3b57" />
        <path d="M30 -236V-170M78 -236V-170" stroke="#24314a" strokeWidth="2" />
        <path d="M-10 -170H110V-142H-10Z" fill="#3b4b6b" />
        <path d="M-10 -170H110V-163H-10Z" fill="#000" fillOpacity=".14" />
        <path d="M-10 -150H110" stroke="#e9dfc8" strokeOpacity=".5" strokeWidth="1.6" strokeDasharray="4 4" />
        {shoe !== "bare" && <g key={shoe} className="av-fr__shoe" dangerouslySetInnerHTML={{ __html: SHOES[shoe] }} />}
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
  const [chosen, setChosen] = useState<{ slug: string; hex: string | null } | null>(initial ? { slug: initial.slug, hex: initial.hex ?? null } : null);

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

  // Only socks we can draw; the chosen one stays while it is of this height, otherwise the first of the list.
  // The sock a product page opened us on stays first in its own height, even if the list would not reach it.
  const drawable = useMemo(() => {
    const list = products ?? [];
    const own = initial?.product && cut === initial.cut && !list.some((p) => p.slug === initial.slug) ? [initial.product, ...list] : list;
    return own.filter((p) => specs?.[p.slug]);
  }, [products, specs, cut, initial]);
  const current = drawable.find((p) => p.slug === chosen?.slug) ?? drawable[0];
  const hex = current && chosen?.slug === current.slug ? chosen.hex : current?.colors[0] ?? null;
  const spec: SockSpec = current && specs ? { ...specFor(specs, current.slug, hex)!, cut } : { ...HOUSE, cut };
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
      </div>

      <div className="av-fr__room">
        <Stage spec={spec} shoe={shoe} skin={skin} cut={cut} />
        <div className="av-fr__on">
          {current ? (
            <>
              <div className="av-fr__now">
                <span className="av-fr__tag">{t("fr.onTheLeg")}</span>
                <strong>{current.name}</strong>
                <Price amount={current.minPrice} from={current.variantCount > 1} />
              </div>
              {current.colors.length > 1 && (
                <div className="av-fr__colours" role="group" aria-label={t("pdp.colour")}>
                  {current.colors.slice(0, 8).map((c) => (
                    <button key={c} type="button" className="av-fr__dot" style={{ background: c }} aria-pressed={c === hex}
                            aria-label={t("fr.colourN", { hex: c })} onClick={() => setChosen({ slug: current.slug, hex: c })} />
                  ))}
                </div>
              )}
              <div className="av-row">
                <Button to={`/products/${current.slug}${hex ? `?colour=${encodeURIComponent(hex.replace("#", ""))}` : ""}`} size="sm" onClick={onPick}>{t("fr.see")}</Button>
                <Button to={`/shop?cut=${cut}`} size="sm" variant="ghost">{t("height.shop", { cut: t(`cut.${cut}` as MessageKey).toLowerCase() })}</Button>
              </div>
            </>
          ) : (
            <p className="av-small av-muted">{products === null || specs === null ? t("fr.loading") : t("fr.none")}</p>
          )}
        </div>
        {drawable.length > 1 && (
          <ul className="av-fr__rail" aria-label={t("fr.rail", { cut: t(`cut.${cut}` as MessageKey) })}>
            {drawable.map((p) => (
              <li key={p.slug}>
                <button type="button" aria-pressed={p.slug === current?.slug} onClick={() => setChosen({ slug: p.slug, hex: p.colors[0] ?? null })}>
                  <span className="av-fr__thumb"><ProductImage image={p.image} /></span>
                  <span className="av-fr__thumbname">{p.name}</span>
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
