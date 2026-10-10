import { useState } from "react";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

/** Designs to drop into the box: a few of each audience, so a family collection is easy to picture. */
const DESIGNS: Array<{ key: MessageKey; spec: SockSpec }> = [
  { key: "style.argyle", spec: { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream } },
  { key: "style.oimo", spec: { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold } },
  { key: "style.hearts", spec: { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" } },
  { key: "style.kids", spec: { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream } },
  { key: "style.dino", spec: { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white } },
  { key: "style.stripes", spec: { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral } },
];

const MAX = 120;
const SHOWN = 30;

/**
 * The collection price, played with: tap socks into a box and watch the step reached on the ladder. Uses the shop's
 * real minimum and tiers (from /api/pricing), the same rule the bag and checkout apply, so the lesson is true.
 */
export function BoxBuilder({ minPairs, tiers }: { minPairs: number; tiers: Array<{ minPairs: number; discountPct: number }> }) {
  const { t } = useT();
  const [picks, setPicks] = useState<number[]>([1, 0, 3, 0, 4, 1, 2, 5]);
  const pairs = picks.length;
  const steps = [...tiers].sort((a, b) => a.minPairs - b.minPairs);
  const reached = [...steps].reverse().find((s) => pairs >= s.minPairs);
  const next = steps.find((s) => pairs < s.minPairs);
  const top = Math.max(steps.at(-1)?.minPairs ?? 0, minPairs, 10);
  const scale = (n: number) => `${Math.min(100, (n / top) * 100)}%`;

  const add = (i: number) => setPicks((p) => (p.length >= MAX ? p : [...p, i]));

  let status: string;
  if (pairs < minPairs) status = t("box.needMin", { n: minPairs - pairs, min: minPairs });
  else if (next) status = t("box.next", { n: next.minPairs - pairs, pct: Number(next.discountPct) });
  else status = t("box.top");

  return (
    <section className="av-block" aria-labelledby="box-title" data-reveal>
      <div className="av-container">
        <div className="av-builder">
          <div className="av-stack av-builder__copy">
            <span className="av-eyebrow av-orn">{t("ladder.eyebrow")}</span>
            <h2 id="box-title">{t("box.title")}</h2>
            <p className="av-lead">{t("box.lead")}</p>
            <div className="av-builder__picks">
              {DESIGNS.map((d, i) => (
                <button key={d.key} type="button" className="av-pick" onClick={() => add(i)} aria-label={t("box.add", { name: t(d.key) })}>
                  <SockArt {...d.spec} />
                  <span>{t(d.key)}</span>
                  <b aria-hidden="true">+</b>
                </button>
              ))}
            </div>
          </div>

          <div className="av-builder__box">
            <div className="av-crate" aria-hidden="true">
              <div className="av-crate__in">
                {picks.slice(-SHOWN).map((d, i) => (
                  <span key={`${picks.length - Math.min(picks.length, SHOWN) + i}`} className="av-crate__sock" style={{ "--r": `${((i * 37) % 24) - 12}deg` } as React.CSSProperties}>
                    <SockArt {...DESIGNS[d].spec} />
                  </span>
                ))}
              </div>
              <div className="av-crate__front"><span>AK&amp;VEN</span></div>
            </div>

            <div className="av-builder__sum" aria-live="polite">
              <div className="av-builder__count">
                <strong className="av-num">{pairs}</strong>
                <span>{t("box.pairs")}</span>
                <span className="av-builder__off av-num">{reached ? t("box.off", { pct: Number(reached.discountPct) }) : t("ladder.base")}</span>
              </div>
              <div className="av-meter" role="presentation">
                <i style={{ width: scale(pairs) }} />
                {minPairs > 1 && <span className="av-meter__mark is-min" style={{ left: scale(minPairs) }}>{minPairs}</span>}
                {steps.map((s) => (
                  <span key={s.minPairs} className={`av-meter__mark${pairs >= s.minPairs ? " is-on" : ""}`} style={{ left: scale(s.minPairs) }}>
                    {s.minPairs}<em>−{Number(s.discountPct)}%</em>
                  </span>
                ))}
              </div>
              <p className="av-builder__status">{status}</p>
              <div className="av-row">
                <Button to="/shop">{t("ladder.cta")}</Button>
                <Button variant="secondary" onClick={() => setPicks([])} disabled={pairs === 0}>{t("box.empty")}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
