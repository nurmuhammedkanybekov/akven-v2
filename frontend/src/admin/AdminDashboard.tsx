import { useState } from "react";
import { adminEvaluation, adminNegotiationStats } from "../api/endpoints";
import type { EvaluationReport, NegotiationStats } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { useAsync } from "../hooks/useAsync";
import { formatPrice } from "../lib/format";
import { useT } from "../i18n/I18n";

const RANGES = [7, 30, 90];
const pct = (n: number | null) => (n == null ? "—" : `${Number(n)}%`);

/** How the assistant is doing and what sells, for the owners. Never shows cost prices or discount limits of real socks. */
export function AdminDashboard() {
  const { t } = useT();
  const [days, setDays] = useState(30);
  const stats = useAsync(() => adminNegotiationStats(days), [days]);
  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("a.db.eyebrow")}</span><h1>{t("a.nav.dashboard")}</h1></div>
        <div className="av-row" role="group" aria-label={t("a.db.period")}>
          {RANGES.map((d) => <button key={d} type="button" className="av-tabbtn" aria-pressed={days === d} onClick={() => setDays(d)}>{t("a.db.lastDays", { n: d })}</button>)}
        </div>
      </header>
      {stats.error && <Alert tone="danger">{stats.error.message}</Alert>}
      {stats.loading && !stats.data && <Skeleton height={260} />}
      {stats.data && <Stats s={stats.data} />}
      <Comparison />
    </>
  );
}

function Stats({ s }: { s: NegotiationStats }) {
  const { t: tr } = useT();
  const t = s.totals;
  return (
    <>
      <ul className="av-tiles4" aria-label={tr("a.db.totals")}>
        <li><span className="av-eyebrow">{tr("a.db.offers")}</span><strong className="av-num">{t.offers}</strong><span className="av-small">{tr("a.db.inLast", { n: s.days })}</span></li>
        <li><span className="av-eyebrow">{tr("a.db.became")}</span><strong className="av-num">{pct(t.conversionPct)}</strong><span className="av-small">{tr("a.db.ofOffers", { used: t.offersUsed, n: t.offers })}</span></li>
        <li><span className="av-eyebrow">{tr("a.db.avg")}</span><strong className="av-num">{pct(t.averageDiscountPct)}</strong><span className="av-small">{tr("a.db.asked", { pct: pct(t.averageProposedPct) })}</span></li>
        <li><span className="av-eyebrow">{tr("a.db.limited")}</span><strong className="av-num">{pct(t.limitedPct)}</strong><span className="av-small">{tr("a.db.limitedN", { n: t.limitedByShop })}</span></li>
      </ul>
      <OffersChart s={s} />
      <div className="av-formgrid">
        <section className="av-card-form" aria-labelledby="top-h">
          <h2 id="top-h" className="av-formtitle">{tr("a.db.best")}</h2>
          {s.topItems.length === 0 ? <p className="av-small">{tr("a.db.noPaid")}</p> : (
            <table className="av-table">
              <thead><tr><th scope="col">{tr("a.db.sock")}</th><th scope="col">{tr("a.db.pairs")}</th><th scope="col">{tr("a.db.revenue")}</th></tr></thead>
              <tbody>{s.topItems.map((i) => <tr key={i.sku}><td>{i.productName}<br /><span className="av-small av-muted">{i.sku}</span></td><td className="av-num">{i.pairsSold}</td><td className="av-num">{formatPrice(i.revenue)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="av-card-form" aria-labelledby="src-h">
          <h2 id="src-h" className="av-formtitle">{tr("a.db.why")}</h2>
          <table className="av-table">
            <thead><tr><th scope="col">{tr("a.db.price")}</th><th scope="col">{tr("a.db.lines")}</th></tr></thead>
            <tbody>
              {s.discountSources.map((d) => (
                <tr key={d.source}><td>{tr(d.source === "NONE" ? "a.db.src.NONE" : d.source === "TIER" ? "a.db.src.TIER" : "a.db.src.NEGOTIATED")}</td><td className="av-num">{d.lines}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="av-small">{tr("a.db.negotiatedRevenue")} <strong className="av-num">{formatPrice(t.negotiatedRevenue)}</strong></p>
        </section>
      </div>
    </>
  );
}

/** Offers per day: one series, so no legend; the title names it. Hover a bar for the day; the table below has every number. */
function OffersChart({ s }: { s: NegotiationStats }) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...s.perDay.map((d) => d.offers));
  const W = 720, H = 180, pad = 24, gap = 2;
  const bw = (W - pad) / s.perDay.length - gap;
  const y = (n: number) => H - pad - (n / max) * (H - pad * 2);
  const day = hover != null ? s.perDay[hover] : null;
  return (
    <section className="av-card-form" aria-labelledby="chart-h">
      <h2 id="chart-h" className="av-formtitle">{t("a.db.perDay")}</h2>
      <div className="av-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("a.db.chartAria", { n: s.days, max })} onMouseLeave={() => setHover(null)}>
          <line x1={pad} x2={W} y1={H - pad} y2={H - pad} className="av-chart__axis" />
          <text x={pad - 6} y={y(max) + 4} className="av-chart__tick" textAnchor="end">{max}</text>
          <text x={pad - 6} y={H - pad + 4} className="av-chart__tick" textAnchor="end">0</text>
          {s.perDay.map((d, i) => {
            const x = pad + i * (bw + gap);
            const h = Math.max(d.offers > 0 ? 2 : 0, H - pad - y(d.offers));
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)}>
                <rect x={x - gap / 2} y={0} width={bw + gap} height={H - pad} fill="transparent" />
                {h > 0 && <path className={`av-chart__bar${hover === i ? " is-hover" : ""}`}
                                d={`M${x},${H - pad} V${H - pad - h + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, bw / 2)},-${Math.min(4, h)} H${x + bw - Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, h)} V${H - pad} Z`} />}
              </g>
            );
          })}
          <text x={pad} y={H - 6} className="av-chart__tick">{s.perDay[0]?.date}</text>
          <text x={W} y={H - 6} className="av-chart__tick" textAnchor="end">{s.perDay[s.perDay.length - 1]?.date}</text>
        </svg>
        {day && (
          <div className="av-chart__tip" role="status">
            <strong>{day.date}</strong>
            <span className="av-num">{t("a.db.tip", { offers: day.offers, used: day.offersUsed, cut: day.limitedByShop })}</span>
            <span className="av-num">{t("a.db.tipAvg", { pct: pct(day.averageDiscountPct) })}</span>
          </div>
        )}
      </div>
      <details>
        <summary className="av-small">{t("a.db.asTable")}</summary>
        <table className="av-table">
          <thead><tr><th scope="col">{t("a.db.day")}</th><th scope="col">{t("a.db.offers")}</th><th scope="col">{t("a.db.became")}</th><th scope="col">{t("a.db.cut")}</th><th scope="col">{t("a.db.avg")}</th></tr></thead>
          <tbody>{s.perDay.filter((d) => d.offers > 0).map((d) => <tr key={d.date}><td>{d.date}</td><td className="av-num">{d.offers}</td><td className="av-num">{d.offersUsed}</td><td className="av-num">{d.limitedByShop}</td><td className="av-num">{pct(d.averageDiscountPct)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

/** The rule-based against AI comparison for the evaluation chapter, from the recorded answers. */
function Comparison() {
  const { t } = useT();
  const report = useAsync(() => adminEvaluation(), []);
  if (report.loading && !report.data) return <Skeleton height={200} />;
  if (report.error || !report.data) return <Alert tone="danger">{report.error?.message ?? t("a.cmp.failed")}</Alert>;
  return <ComparisonReport report={report.data} />;
}

/** One comparison report, recorded or live, with where the AI answers came from stated first. */
export function ComparisonReport({ report: r }: { report: EvaluationReport }) {
  const { t } = useT();
  const source = t(r.aiSource === "LIVE" ? "a.cmp.src.LIVE" : r.aiSource === "RECORDED" ? "a.cmp.src.RECORDED" : "a.cmp.src.SCRIPTED");
  return (
    <section className="av-card-form" aria-labelledby={`eval-h-${r.aiSource}`}>
      <h2 id={`eval-h-${r.aiSource}`} className="av-formtitle">{t("a.cmp.title")}</h2>
      <Alert><strong>{source}.</strong> {r.note}</Alert>
      <table className="av-table">
        <thead><tr><th scope="col"></th><th scope="col">{t("a.cmp.rules")}</th><th scope="col">{t("a.cmp.ai")} ({source.toLowerCase()})</th></tr></thead>
        <tbody>
          <tr><th scope="row">{t("a.cmp.avg")}</th><td className="av-num">{pct(r.rule.averageFinalPct)}</td><td className="av-num">{pct(r.ai.averageFinalPct)}</td></tr>
          <tr><th scope="row">{t("a.cmp.buy")}</th><td className="av-num">{pct(r.rule.acceptedPct)}</td><td className="av-num">{pct(r.ai.acceptedPct)}</td></tr>
          <tr><th scope="row">{t("a.cmp.limited")}</th><td className="av-num">{r.rule.limited}</td><td className="av-num">{r.ai.limited}</td></tr>
          <tr><th scope="row">{t("a.cmp.below")}</th><td><Badge tone={r.rule.aboveLimit === 0 ? "success" : "danger"}>{r.rule.aboveLimit}</Badge></td><td><Badge tone={r.ai.aboveLimit === 0 ? "success" : "danger"}>{r.ai.aboveLimit}</Badge></td></tr>
          <tr><th scope="row">{t("a.cmp.revenue")}</th><td className="av-num">{formatPrice(r.rule.revenue)}</td><td className="av-num">{formatPrice(r.ai.revenue)}</td></tr>
        </tbody>
      </table>
      <details>
        <summary className="av-small">{t("a.cmp.showAll", { n: r.rows.length })}</summary>
        <div className="av-tablewrap">
          <table className="av-table">
            <thead><tr><th scope="col">{t("a.orders.customer")}</th><th scope="col">{t("a.cmp.message")}</th><th scope="col">{t("a.db.pairs")}</th><th scope="col">{t("a.cmp.limit")}</th><th scope="col">{t("a.cmp.rules")}</th><th scope="col">{t("a.cmp.ai")}</th></tr></thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.customer}</td>
                  <td className="av-small">{x.message}{x.aiReply && <><br /><span className="av-muted">{t("a.cmp.aiSaid")} {x.aiReply}</span></>}</td>
                  <td className="av-num">{x.quantity}</td><td className="av-num">{pct(x.limitPct)}</td>
                  <td className="av-num">{pct(x.rule.proposedPct)} → {pct(x.rule.finalPct)}{x.rule.limited && ` (${t("a.cmp.cut")})`}{x.rule.accepted ? " ✓" : ""}</td>
                  <td className="av-num">{pct(x.ai.proposedPct)} → {pct(x.ai.finalPct)}{x.ai.limited && ` (${t("a.cmp.cut")})`}{x.ai.accepted ? " ✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="av-small">{t("a.cmp.legend")}</p>
      </details>
    </section>
  );
}
