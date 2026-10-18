import { listProducts } from "../../api/endpoints";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";

/**
 * The shop in four numbers, then how an order works in three steps: big figures on a flat block, the way Wise states
 * its fees. Every figure comes from the shop's own data (the shelf, the price steps) or from the family's history.
 */
export function Facts({ tiers }: { tiers: Array<{ minPairs: number; discountPct: number }> }) {
  const { t } = useT();
  const count = useAsync((signal) => listProducts({ pageSize: 1 }, signal), []);
  const top = [...tiers].sort((a, b) => b.discountPct - a.discountPct)[0];
  const figures = [
    count.data && count.data.totalItems > 0 ? { n: String(count.data.totalItems), text: t("facts.designs") } : null,
    top ? { n: `−${Number(top.discountPct)}%`, text: t("facts.discount", { n: top.minPairs }) } : null,
    { n: "2018", text: t("facts.since") },
    { n: "4", text: t("facts.countries") },
  ].filter((f): f is { n: string; text: string } => f !== null);

  return (
    <section className="av-facts2" aria-labelledby="facts-title" data-reveal>
      <div className="av-container">
        <h2 id="facts-title" className="av-visually-hidden">{t("facts.title")}</h2>
        <ul className="av-facts2__figures">
          {figures.map((f) => <li key={f.text}><strong>{f.n}</strong><span>{f.text}</span></li>)}
        </ul>
        <h3 className="av-facts2__how">{t("how.title")}</h3>
        <ol className="av-facts2__steps">
          {(["s1", "s2", "s3"] as const).map((s, i) => (
            <li key={s}><span aria-hidden="true">{i + 1}</span><div><strong>{t(`how.${s}`)}</strong><p>{t(`how.${s}t`)}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
