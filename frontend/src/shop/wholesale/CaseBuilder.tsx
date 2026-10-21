import { useState } from "react";
import { getTerms } from "../../api/endpoints";
import { PairMeter } from "../../components/PairMeter";
import { Button } from "../../components/Button";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const WHO = ["MEN", "WOMEN", "KIDS"] as const;
/** Packs of 12 pairs, as the stall sells them to shops; a case is about 240 pairs. */
export const DOZEN = 12;
export const CASE = 240;

/**
 * "Build a case" for shops: how many dozens of each shelf (classic, casual, sport, ... for men, women and children),
 * with the case filling up as they go, and the mix written into the request in one tap. It sends nothing: the shop
 * still checks and sends the message itself.
 */
export function CaseBuilder({ onUse }: { onUse: (mix: string, pairs: number) => void }) {
  const { t } = useT();
  const terms = useAsync((signal) => getTerms().then((x) => { if (signal.aborted) throw new Error("aborted"); return x; }), []);
  const sections = terms.data?.sections ?? [];
  const [dozens, setDozens] = useState<Record<string, number>>({});
  const key = (s: string, w: string) => `${s}|${w}`;
  const total = Object.values(dozens).reduce((a, b) => a + b, 0) * DOZEN;
  const cases = Math.floor(total / CASE);
  const rest = total % CASE;
  const change = (k: string, by: number) => setDozens((d) => ({ ...d, [k]: Math.max(0, Math.min(99, (d[k] ?? 0) + by)) }));
  const mix = sections.flatMap((s) => WHO.flatMap((w) => {
    const n = dozens[key(s.slug, w)] ?? 0;
    return n ? [`${s.name} · ${t(`nav.${w.toLowerCase()}` as MessageKey)}: ${n * DOZEN}`] : [];
  })).join("; ");
  if (sections.length === 0) return null;
  return (
    <section className="av-casebuild" aria-labelledby="case-title">
      <header>
        <span className="av-hand">{t("case.eyebrow")}</span>
        <h2 id="case-title">{t("case.title")}</h2>
        <p className="av-lead">{t("case.lead")}</p>
      </header>
      <div className="av-casebuild__grid" role="table" aria-label={t("case.title")}>
        <div role="row" className="av-casebuild__row av-casebuild__head">
          <span role="columnheader" />
          {WHO.map((w) => <span key={w} role="columnheader">{t(`nav.${w.toLowerCase()}` as MessageKey)}</span>)}
        </div>
        {sections.map((s) => (
          <div role="row" key={s.slug} className="av-casebuild__row">
            <span role="rowheader" className="av-casebuild__name">{s.name}</span>
            {WHO.map((w) => {
              const k = key(s.slug, w), n = dozens[k] ?? 0;
              const label = `${s.name}, ${t(`nav.${w.toLowerCase()}` as MessageKey)}`;
              return (
                <span role="cell" key={w} className={`av-casebuild__cell${n ? " is-on" : ""}`}>
                  <button type="button" aria-label={t("case.less", { what: label })} onClick={() => change(k, -1)} disabled={!n}>−</button>
                  <output aria-live="polite" aria-label={label} key={n}>{n * DOZEN}</output>
                  <button type="button" aria-label={t("case.more", { what: label })} onClick={() => change(k, 1)}>+</button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="av-casebuild__sum">
        <PairMeter total={rest || (total && CASE)} target={CASE} />
        <p><strong className="av-num">{t("bag.pairs", { n: total })}</strong> · {cases > 0 ? t("case.cases", { n: cases, rest }) : t("case.toCase", { n: CASE - total })}</p>
        <Button disabled={total === 0} onClick={() => onUse(mix, total)}>{t("case.use")}</Button>
      </div>
    </section>
  );
}
