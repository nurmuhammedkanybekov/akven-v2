import { useEffect, useMemo, useRef, useState } from "react";
import { getPricing, getProduct, listProducts } from "../../api/endpoints";
import type { Category, ProductDetail, ProductSummary, VariantView } from "../../api/types";
import { Button } from "../../components/Button";
import { PairMeter } from "../../components/PairMeter";
import { ProductImage } from "../../components/ProductImage";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { useMoney } from "../useMoney";

/** Shops buy by the dozen; a case is about 240 pairs. */
export const DOZEN = 12;
export const CASE = 240;
const SHELVES: Category[] = ["MEN", "WOMEN", "KIDS"];
const KEY = "akven-case-v1";

/** One line of the case: one colour and size of one sock, in pairs (always a whole number of dozens). */
export interface CaseLine { sku: string; slug: string; name: string; color: string | null; colorHex: string | null; size: string | null; price: number; image: string | null; pairs: number }

function readCase(): Record<string, CaseLine> {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

/** The text that goes into the request: one line per colour and size, with its code, so the family knows exactly what. */
export function mixText(lines: CaseLine[]): string {
  return lines.map((l) => `${[l.name, l.color, l.size].filter(Boolean).join(", ")} × ${l.pairs} (${l.sku})`).join("\n");
}

/**
 * "Build a case" for shops, from the real shelves: find a sock, open it, and choose dozens of each colour and size,
 * with what is in stock now beside it. The case on the right shows every line, the pairs, the price step the order
 * reaches and an estimate; one tap puts the exact list into the request below. Kept on this device until sent.
 */
export function CaseBuilder({ onUse }: { onUse: (mix: string, pairs: number) => void }) {
  const { t } = useT();
  const { money } = useMoney();
  const [shelf, setShelf] = useState<Category>("WOMEN");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, CaseLine>>(readCase);
  const [nudge, setNudge] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => { const id = window.setTimeout(() => setQuery(q.trim()), 300); return () => window.clearTimeout(id); }, [q]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* this visit only */ } }, [lines]);

  const products = useAsync((signal) => listProducts({ category: query ? undefined : shelf, q: query || undefined, pageSize: 12 }, signal), [shelf, query]);
  const pricing = useAsync((signal) => getPricing(signal), []);
  const list = Object.values(lines).filter((l) => l.pairs > 0);
  const total = list.reduce((n, l) => n + l.pairs, 0);
  const tiers = [...(pricing.data?.tiers ?? [])].sort((a, b) => a.minPairs - b.minPairs);
  const step = [...tiers].reverse().find((x) => x.minPairs <= total);
  const next = tiers.find((x) => x.minPairs > total);
  const before = list.reduce((n, l) => n + l.price * l.pairs, 0);
  const estimate = before * (100 - Number(step?.discountPct ?? 0)) / 100;

  const set = (v: VariantView, p: ProductDetail, pairs: number) => setLines((m) => ({
    ...m, [v.sku]: { sku: v.sku, slug: p.slug, name: p.name, color: v.color, colorHex: v.colorHex, size: (v.packSize ?? 1) > 1 ? [v.size, t("case.packOf", { n: v.packSize! })].filter(Boolean).join(", ") : v.size, price: Number(v.price) / Math.max(1, v.packSize ?? 1),
      image: p.images?.[0]?.url ?? null, pairs: Math.max(0, Math.min(9996, pairs)) },
  }));
  const change = (sku: string, by: number) => setLines((m) => (m[sku] ? { ...m, [sku]: { ...m[sku], pairs: Math.max(0, m[sku].pairs + by) } } : m));

  return (
    <section className="av-casebuild" aria-labelledby="case-title">
      <header>
        <span className="av-hand">{t("case.eyebrow")}</span>
        <h2 id="case-title">{t("case.title")}</h2>
        <p className="av-lead">{t("case.lead")}</p>
      </header>
      <div className="av-casebuild__layout">
        <div className="av-casebuild__shelf">
          <div className="av-casebuild__find">
            <div className="av-tabs av-tabs--inline" role="group" aria-label={t("case.shelf")}>
              {SHELVES.map((s) => <button key={s} type="button" className="av-tabbtn" aria-pressed={!query && shelf === s} onClick={() => { setShelf(s); setQ(""); setOpen(null); }}>{t(`nav.${s.toLowerCase()}` as MessageKey)}</button>)}
            </div>
            <input ref={search} className="av-input" type="search" value={q} placeholder={t("case.search")} aria-label={t("case.search")} onChange={(e) => { setQ(e.target.value); setOpen(null); }} />
            {total > 0 && <a className="av-casebuild__jump" href="#case-list-h">{t("case.yours")}: {t("bag.pairs", { n: total })} ↓</a>}
          </div>
          {products.loading && !products.data && <p className="av-small av-muted">{t("case.loading")}</p>}
          {products.data && products.data.items.length === 0 && <p className="av-small">{t("case.nothing")}</p>}
          <ul className="av-casebuild__socks">
            {(products.data?.items ?? []).map((p) => (
              <SockRow key={p.slug} p={p} open={open === p.slug} onToggle={() => setOpen(open === p.slug ? null : p.slug)} lines={lines} onSet={set} />
            ))}
          </ul>
        </div>

        <aside className="av-casebuild__case" aria-labelledby="case-list-h">
          <h3 id="case-list-h">{t("case.yours")}</h3>
          {list.length === 0 ? (
            <p id="case-hint" className={`av-small av-casebuild__hint${nudge ? " is-nudged" : ""}`} aria-live="polite">{t("case.empty")} <a href="#quote">{t("case.skip")}</a></p>
          ) : (
            <ul className="av-casebuild__lines">
              {list.map((l) => (
                <li key={l.sku}>
                  <span className="av-casebuild__dot" style={{ background: l.colorHex ?? "var(--surface-2)" }} aria-hidden="true" />
                  <span className="av-casebuild__what"><strong>{l.name}</strong><span className="av-small av-muted">{[l.color, l.size].filter(Boolean).join(" · ")}</span></span>
                  <span className="av-casebuild__step">
                    <button type="button" aria-label={t("case.less", { what: `${l.name}, ${l.color ?? ""} ${l.size ?? ""}` })} onClick={() => change(l.sku, -DOZEN)}>−</button>
                    <output aria-live="polite">{l.pairs}</output>
                    <button type="button" aria-label={t("case.more", { what: `${l.name}, ${l.color ?? ""} ${l.size ?? ""}` })} onClick={() => change(l.sku, DOZEN)}>+</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <PairMeter total={total % CASE || (total && CASE)} target={CASE} />
          <p className="av-casebuild__sum"><strong className="av-num">{t("bag.pairs", { n: total })}</strong> · {total >= CASE ? t("case.cases", { n: Math.floor(total / CASE), rest: total % CASE }) : t("case.toCase", { n: CASE - total })}</p>
          {total > 0 && (
            <dl className="av-casebuild__money">
              <div><dt>{t("case.shelfPrice")}</dt><dd>{money(before)}</dd></div>
              {step && <div><dt>{t("case.step", { pct: Number(step.discountPct), n: step.minPairs })}</dt><dd>−{money(before - estimate)}</dd></div>}
              <div className="is-total"><dt>{t("case.about")}</dt><dd>{money(estimate)}</dd></div>
            </dl>
          )}
          {next && total > 0 && <p className="av-small av-muted">{t("case.next", { n: next.minPairs - total, pct: Number(next.discountPct) })}</p>}
          <p className="av-small av-muted">{t("case.familyPrice")}</p>
          <div className="av-row">
            <Button aria-describedby={total === 0 ? "case-hint" : undefined} onClick={() => {
              if (total > 0) { onUse(mixText(list), total); return; }
              setNudge(true);
              search.current?.focus();
            }}>{t("case.use")}</Button>
            {total > 0 && <Button variant="ghost" onClick={() => { if (window.confirm(t("case.clearQ"))) setLines({}); }}>{t("case.empty.clear")}</Button>}
          </div>
        </aside>
      </div>
    </section>
  );
}

/** A sock on the shelf; opened, its colours and sizes with what is in stock and a dozen stepper for each. */
function SockRow({ p, open, onToggle, lines, onSet }: { p: ProductSummary; open: boolean; onToggle: () => void; lines: Record<string, CaseLine>;
  onSet: (v: VariantView, p: ProductDetail, pairs: number) => void }) {
  const { t } = useT();
  const { money } = useMoney();
  const detail = useAsync(() => (open ? getProduct(p.slug) : Promise.resolve(null)), [open, p.slug]);
  const inCase = useMemo(() => Object.values(lines).filter((l) => l.slug === p.slug).reduce((n, l) => n + l.pairs, 0), [lines, p.slug]);
  return (
    <li className={`av-casebuild__sock${open ? " is-open" : ""}`}>
      <button type="button" className="av-casebuild__sockhead" aria-expanded={open} onClick={onToggle}>
        <span className="av-casebuild__img"><ProductImage image={p.image} /></span>
        <span className="av-casebuild__what"><strong>{p.name}</strong>
          <span className="av-small av-muted">{p.minPrice != null && t("case.from", { price: money(Number(p.minPairPrice ?? p.minPrice)) })}{p.section && ` · ${p.section.name}`}</span>
          <span className="av-prodcell__dots" aria-hidden="true">{p.colors.slice(0, 8).map((c) => <i key={c} style={{ background: c }} />)}</span></span>
        {inCase > 0 && <span className="av-casebuild__badge">{t("bag.pairs", { n: inCase })}</span>}
        <span aria-hidden="true" className="av-casebuild__chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="av-casebuild__variants">
          {!detail.data && <p className="av-small av-muted">{t("case.loading")}</p>}
          {detail.data && (
            <table className="av-table av-table--tight">
              <thead><tr><th scope="col">{t("case.colour")}</th><th scope="col">{t("case.size")}</th><th scope="col">{t("case.inStock")}</th><th scope="col">{t("case.pairs")}</th></tr></thead>
              <tbody>
                {detail.data.variants.map((v) => {
                  const pairs = lines[v.sku]?.pairs ?? 0;
                  const pack = (v.packSize ?? 1) > 1 ? ` (${t("case.packOf", { n: v.packSize! })})` : "";
                  const label = `${p.name}, ${v.color ?? ""} ${v.size ?? ""}`.trim() + pack;
                  // A pack's stock is counted in packs; the case counts pairs.
                  const stock = v.availableQty * Math.max(1, v.packSize ?? 1);
                  return (
                    <tr key={v.sku}>
                      <td><span className="av-casebuild__dot" style={{ background: v.colorHex ?? "var(--surface-2)" }} aria-hidden="true" /> {v.color ?? "—"}</td>
                      <td>{v.size ?? "—"}{(v.packSize ?? 1) > 1 && <span className="av-small av-muted"> · {t("case.packOf", { n: v.packSize! })}</span>}</td>
                      <td className="av-small">{stock > 0 ? stock : v.restockInDays != null ? t("case.soon", { n: v.restockInDays }) : t("stock.out")}</td>
                      <td>
                        <span className="av-casebuild__step">
                          <button type="button" aria-label={t("case.less", { what: label })} disabled={!pairs} onClick={() => onSet(v, detail.data!, pairs - DOZEN)}>−</button>
                          <output aria-live="polite">{pairs}</output>
                          <button type="button" data-more aria-label={t("case.more", { what: label })} onClick={() => onSet(v, detail.data!, pairs + DOZEN)}>+</button>
                        </span>
                        {pairs > stock && pairs > 0 && <span className="av-small av-casebuild__warn">{t("case.moreThanStock")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  );
}
