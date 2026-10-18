import { useId, useMemo, useState } from "react";
import { listProducts } from "../../api/endpoints";
import type { Category } from "../../api/types";
import { Button } from "../../components/Button";
import { OpenNow } from "../../components/OpenNow";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { useMoney } from "../useMoney";
import { useShopInfo } from "../useShopInfo";

type Who = Extract<Category, "MEN" | "WOMEN" | "KIDS">;
const WHO: Who[] = ["MEN", "WOMEN", "KIDS"];
const MAX = 200;

/** The middle pair price in a category: half the shelf is cheaper, half dearer. */
export function typicalPairPrice(prices: Array<number | null | undefined>): number | null {
  const sorted = prices.filter((p): p is number => typeof p === "number" && p > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

/** The step a number of pairs reaches, and the next one. */
export function ladder(pairs: number, tiers: Array<{ minPairs: number; discountPct: number }>) {
  const steps = [...tiers].sort((a, b) => a.minPairs - b.minPairs);
  const reached = [...steps].reverse().find((s) => pairs >= s.minPairs) ?? null;
  const next = steps.find((s) => pairs < s.minPairs) ?? null;
  return { pct: reached ? Number(reached.discountPct) : 0, next };
}

/**
 * The opening of the shop, the way Wise opens with its converter: say how many pairs, see what a pair and the whole
 * bag cost today, and how many more pairs take the next step off. The example pair is the middle price of today's
 * shelf for men, women or children, so the numbers are the shop's own, not invented.
 */
export function HeroCalculator({ minPairs, tiers }: { minPairs: number; tiers: Array<{ minPairs: number; discountPct: number }> }) {
  const { t } = useT();
  const { money } = useMoney();
  const uid = useId();
  const stall = useShopInfo()?.pickupPoints[0];
  const [who, setWho] = useState<Who>("WOMEN");
  const [pairs, setPairs] = useState(Math.max(20, minPairs));
  const shelf = useAsync((signal) => listProducts({ category: who, pageSize: 48, inStock: true }, signal), [who]);
  const pair = useMemo(() => typicalPairPrice(shelf.data?.items.map((p) => p.minPairPrice ?? null) ?? []), [shelf.data]);
  const { pct, next } = ladder(pairs, tiers);
  const each = pair === null ? null : Math.round(pair * (100 - pct)) / 100;
  const total = each === null ? null : Math.round(each * pairs * 100) / 100;
  const set = (n: number) => setPairs(Math.min(MAX, Math.max(1, Math.round(n) || 1)));

  return (
    <section className="av-hero3" aria-labelledby="hero-title">
      <div className="av-container av-hero3__grid">
        <div className="av-hero3__copy">
          <p className="av-hero3__where">{t("hero.where")}</p>
          <h1 id="hero-title" className="av-hero3__title">{t("hero.title1")} <em>{t("hero.title2")}</em></h1>
          <p className="av-hero3__lead">{minPairs > 1 ? t("hero.lead", { n: minPairs }) : t("hero.leadOne")}</p>
          <div className="av-row av-hero3__ctas">
            <Button to="/shop" variant="accent" size="lg">{t("hero.shop")}</Button>
            <Button to="/#family" variant="secondary" size="lg" className="av-btn--onnavy">{t("hero.family")}</Button>
          </div>
          {stall && <OpenNow point={stall} className="av-hero3__open" />}
        </div>

        <form className="av-pricer" aria-labelledby={`${uid}-t`} onSubmit={(e) => e.preventDefault()}>
          <h2 id={`${uid}-t`} className="av-pricer__title">{t("calc.title")}</h2>
          <div className="av-pricer__who" role="group" aria-label={t("calc.for")}>
            {WHO.map((w) => (
              <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(w)}>{t(`nav.${w.toLowerCase()}` as MessageKey)}</button>
            ))}
          </div>
          <div className="av-pricer__pairs">
            <label htmlFor={`${uid}-n`}>{t("calc.pairs")}</label>
            <div className="av-pricer__stepper">
              <button type="button" onClick={() => set(pairs - 1)} aria-label={t("calc.less")} disabled={pairs <= 1}>−</button>
              <input id={`${uid}-n`} type="number" inputMode="numeric" min={1} max={MAX} value={pairs} onChange={(e) => set(Number(e.target.value))} />
              <button type="button" onClick={() => set(pairs + 1)} aria-label={t("calc.more")} disabled={pairs >= MAX}>+</button>
            </div>
          </div>
          <input className="av-pricer__range" type="range" min={1} max={MAX} value={pairs} onChange={(e) => set(Number(e.target.value))}
                 aria-label={t("calc.pairs")} style={{ "--fill": `${(pairs / MAX) * 100}%` } as React.CSSProperties} />
          <dl className="av-pricer__rows" aria-live="polite">
            <div><dt>{t("calc.perPair")}</dt><dd>{each === null ? "…" : <>{pct > 0 && pair !== null && <s>{money(pair)}</s>} {money(each)}</>}</dd></div>
            <div><dt>{t("calc.discount")}</dt><dd className={pct > 0 ? "is-on" : undefined}>{pct > 0 ? `−${pct}%` : "—"}</dd></div>
            <div className="av-pricer__total"><dt>{t("calc.total")}</dt><dd>{total === null ? "…" : money(total)}</dd></div>
          </dl>
          <p className="av-pricer__next">
            {pairs < minPairs ? t("calc.min", { n: minPairs })
              : next ? t("calc.next", { n: next.minPairs - pairs, pct: Number(next.discountPct) })
              : pct > 0 ? t("calc.top", { pct }) : t("calc.mix")}
          </p>
          <Button to="/shop" variant="primary" block>{t("calc.cta")}</Button>
          {pair !== null && <p className="av-pricer__note">{t("calc.note", { who: t(`calc.who.${who}` as MessageKey), price: money(pair) })}</p>}
        </form>
      </div>
    </section>
  );
}
