import { getSizeChart } from "../api/endpoints";
import type { SizeRange, SizeRow } from "../api/types";
import { Skeleton } from "../components/Alert";
import { SizeFinder } from "../components/SizeFinder";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
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

/** One chart, read the way each customer knows sizes: EU and US first in English, local sizes in Russian and Kyrgyz. */
export function SizesPage() {
  const { t, lang } = useT();
  const chart = useAsync((signal) => getSizeChart(lang, signal), [lang]);
  const columns = chart.data?.columns ?? [];
  const all = [...columns, ...["footCm", "krMm", "local", "eu", "us"].filter((c) => !columns.includes(c))];

  return (
    <div className="av-container av-page av-stack av-sizes">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("sizes.eyebrow")}</span>
        <h1>{t("sizes.title")}</h1>
        <p className="av-lead">{t("sizes.lead")}</p>
      </header>
      <SizeFinder />
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
    </div>
  );
}
