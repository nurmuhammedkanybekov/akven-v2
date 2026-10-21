import { getSizeChart } from "../api/endpoints";
import type { SizeRange, SizeRow } from "../api/types";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { SizeFinder } from "../components/SizeFinder";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { FittingRoom } from "../shop/fitting/FittingRoom";
import type { MessageKey } from "../i18n/en";

const LABEL: Record<string, MessageKey> = { footCm: "sizes.footCm", krMm: "sizes.krMm", local: "sizes.local", eu: "sizes.eu", us: "sizes.us" };

function range(r: SizeRange): string {
  const f = (n: number) => String(Number(n));
  return r.min === r.max ? f(r.min) : `${f(r.min)}–${f(r.max)}`;
}

function cell(row: SizeRow, column: string): string {
  if (column === "us") return row.us;
  return range(row[column as "footCm" | "krMm" | "local" | "eu"]);
}

/** How to measure, drawn: a foot on a sheet of paper, a ruler beside it, and the heel-to-toe line drawing itself. */
function MeasureArt() {
  return (
    <svg viewBox="0 0 260 300" className="av-measure" aria-hidden="true">
      <rect x="40" y="14" width="150" height="272" rx="6" className="av-measure__paper" />
      <path className="av-measure__foot" d="M113 270c-22 0-34-16-34-42 0-30 8-52 6-82-2-26-10-44-8-66 2-22 16-36 34-36s30 12 32 32c2 24-6 46-4 72 2 30 12 54 10 80-2 26-14 42-36 42Z" />
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} className="av-measure__toe" cx={92 + i * 11} cy={[42, 36, 36, 40, 48][i]} rx={[8, 6, 5.5, 5, 4.5][i]} ry={[9, 7, 6.5, 6, 5.5][i]} />)}
      <g className="av-measure__ruler">
        <rect x="200" y="14" width="34" height="272" rx="4" />
        {Array.from({ length: 27 }, (_, i) => <path key={i} d={`M200 ${20 + i * 10}h${i % 5 === 0 ? 14 : 8}`} />)}
      </g>
      <path className="av-measure__line" d="M168 270V30" pathLength={1} />
      <path className="av-measure__cap" d="M160 270h16M160 30h16" />
    </svg>
  );
}

/** One chart, read the way each customer knows sizes: EU and US first in English, local sizes in Russian and Kyrgyz. */
export function SizesPage() {
  const { t, lang } = useT();
  const chart = useAsync((signal) => getSizeChart(lang, signal), [lang]);
  const columns = chart.data?.columns ?? [];
  const all = [...columns, ...["footCm", "krMm", "local", "eu", "us"].filter((c) => !columns.includes(c))];

  return (
    <div className="av-container av-page av-stack av-sizes">
      <section className="av-sizes__hero" data-reveal>
        <div className="av-stack">
          <span className="av-eyebrow">{t("sizes.eyebrow")}</span>
          <h1>{t("sizes.title")}</h1>
          <p className="av-lead">{t("sizes.lead")}</p>
          <ol className="av-sizes__how">
            <li><b>1</b>{t("sizes.how1")}</li>
            <li><b>2</b>{t("sizes.how2")}</li>
            <li><b>3</b>{t("sizes.how3")}</li>
          </ol>
        </div>
        <MeasureArt />
      </section>
      <div className="av-sizes__finder"><SizeFinder /></div>
      {chart.loading && !chart.data && <Skeleton height={220} />}
      {chart.data && chart.data.rows.length === 0 && <p className="av-lead">{t("sizes.empty")}</p>}
      {chart.data && chart.data.rows.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table av-sizes__table">
            <thead>
              <tr>
                <th scope="col">{t("sizes.label")}</th>
                {all.map((c, i) => <th key={c} scope="col" className={i < columns.length ? "is-lead" : undefined}>{t(LABEL[c])}</th>)}
              </tr>
            </thead>
            <tbody>
              {chart.data.rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.label}</th>
                  {all.map((c, i) => <td key={c} className={`av-num${i < columns.length ? " is-lead" : ""}`}>{cell(r, c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="av-small av-muted">{t("sizes.note")}</p>
      <section className="av-sizes__fit" aria-labelledby="sizes-fit" data-reveal>
        <span className="av-hand">{t("fr.eyebrow")}</span>
        <h2 id="sizes-fit">{t("fr.title")}</h2>
        <FittingRoom />
      </section>
      <ul className="av-sizes__tips">
        <li><strong>{t("sizes.tip1")}</strong><span>{t("sizes.tip1S")}</span></li>
        <li><strong>{t("sizes.tip2")}</strong><span>{t("sizes.tip2S")}</span></li>
        <li><strong>{t("sizes.tip3")}</strong><span>{t("sizes.tip3S")}</span></li>
      </ul>
      <div className="av-row"><Button to="/#family">{t("sizes.family")}</Button></div>
    </div>
  );
}
