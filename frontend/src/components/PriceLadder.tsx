import { useState } from "react";
import type { PublicPricing, VariantView } from "../api/types";
import { useT } from "../i18n/I18n";
import { useMoney } from "../shop/useMoney";
import { Button } from "./Button";

/** The collection step reached at n pairs: the deepest step whose minimum is met (0 below the first). */
export function stepAt(tiers: PublicPricing["tiers"], n: number): number {
  return tiers.filter((x) => n >= x.minPairs).reduce((best, x) => Math.max(best, Number(x.discountPct)), 0);
}

/**
 * "How the price falls": a slider of pairs for this sock, with the shop's own collection steps marked on it, the price
 * of one pair and of all of them at that count, and what is saved. The same steps apply to the whole bag at
 * checkout, mixed with any socks; the server works out the final price, this only shows the way there.
 */
export function PriceLadder({ pricing, variant, onAdd }: { pricing: PublicPricing; variant: VariantView; onAdd: (packs: number) => void }) {
  const { t } = useT();
  const { money } = useMoney();
  const tiers = [...pricing.tiers].sort((a, b) => a.minPairs - b.minPairs);
  const top = Math.max(60, Math.ceil(((tiers[tiers.length - 1]?.minPairs ?? 50) * 1.4) / 10) * 10);
  const pack = variant.packSize ?? 1;
  const [pairs, setPairs] = useState(Math.max(pack, tiers[0]?.minPairs ?? pack));
  const n = Math.max(pack, Math.round(pairs / pack) * pack);
  const perPair = variant.price / pack;
  const pct = stepAt(tiers, n);
  const now = perPair * (1 - pct / 100);
  const next = tiers.find((x) => x.minPairs > n);
  const packs = Math.min(n / pack, Math.max(1, Math.floor(variant.availableQty)));
  const pos = (v: number) => `${((v - 1) / (top - 1)) * 100}%`;
  return (
    <section className="av-ladder2" aria-labelledby="ladder-title">
      <div className="av-row av-between">
        <h2 id="ladder-title" className="av-ladder2__title">{t("lad.title")}</h2>
        <span className="av-ladder2__pct" key={pct} data-on={pct > 0}>{pct > 0 ? `−${pct}%` : t("lad.none")}</span>
      </div>
      <div className="av-ladder2__track">
        <input type="range" min={1} max={top} step={1} value={pairs} onChange={(e) => setPairs(Number(e.target.value))}
               aria-label={t("lad.pairs")} aria-valuetext={t("bag.pairs", { n })} style={{ "--v": pos(n) } as React.CSSProperties} />
        {tiers.map((x) => (
          <span key={x.minPairs} className={`av-ladder2__mark${n >= x.minPairs ? " is-on" : ""}`} style={{ left: pos(x.minPairs) }} aria-hidden="true">
            <i />{x.minPairs}
          </span>
        ))}
      </div>
      <dl className="av-ladder2__nums">
        <div><dt>{t("lad.pairs")}</dt><dd className="av-num">{n}</dd></div>
        <div><dt>{t("lad.perPair")}</dt><dd className="av-num" key={now.toFixed(2)}>{money(now)}</dd></div>
        <div><dt>{t("lad.total")}</dt><dd className="av-num">{money(now * n)}</dd></div>
        <div><dt>{t("lad.saved")}</dt><dd className="av-num av-price__save">{pct > 0 ? money((perPair - now) * n) : "—"}</dd></div>
      </dl>
      <p className="av-small av-muted">{next ? t("lad.next", { n: next.minPairs - n, pct: Number(next.discountPct) }) : t("lad.top")} {t("lad.mix")}</p>
      {n / pack > variant.availableQty && <p className="av-small av-warning-text">{t("lad.stock", { n: variant.availableQty * pack })}</p>}
      <Button size="sm" variant="secondary" disabled={variant.availableQty <= 0} onClick={() => onAdd(packs)}>{t("lad.add", { n: packs * pack })}</Button>
    </section>
  );
}
