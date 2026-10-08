import { useState } from "react";
import { adminEvaluation, adminNegotiationStats } from "../api/endpoints";
import type { EvaluationReport, NegotiationStats } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { useAsync } from "../hooks/useAsync";
import { formatPrice } from "../lib/format";

const RANGES = [7, 30, 90];
const pct = (n: number | null) => (n == null ? "—" : `${Number(n)}%`);

/** How the assistant is doing and what sells, for the owners. Never shows cost prices or discount limits of real socks. */
export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const stats = useAsync(() => adminNegotiationStats(days), [days]);
  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">Shop team</span><h1>Dashboard</h1></div>
        <div className="av-row" role="group" aria-label="Period">
          {RANGES.map((d) => <button key={d} type="button" className="av-tabbtn" aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
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
  const t = s.totals;
  return (
    <>
      <ul className="av-tiles4" aria-label="Totals">
        <li><span className="av-eyebrow">Offers made</span><strong className="av-num">{t.offers}</strong><span className="av-small">in the last {s.days} days</span></li>
        <li><span className="av-eyebrow">Became orders</span><strong className="av-num">{pct(t.conversionPct)}</strong><span className="av-small">{t.offersUsed} of {t.offers} offers</span></li>
        <li><span className="av-eyebrow">Average discount</span><strong className="av-num">{pct(t.averageDiscountPct)}</strong><span className="av-small">the assistant asked for {pct(t.averageProposedPct)}</span></li>
        <li><span className="av-eyebrow">Limit stepped in</span><strong className="av-num">{pct(t.limitedPct)}</strong><span className="av-small">{t.limitedByShop} offers cut to the shop's limit</span></li>
      </ul>
      <OffersChart s={s} />
      <div className="av-formgrid">
        <section className="av-card-form" aria-labelledby="top-h">
          <h2 id="top-h" className="av-formtitle">Best sellers</h2>
          {s.topItems.length === 0 ? <p className="av-small">No paid orders in this period.</p> : (
            <table className="av-table">
              <thead><tr><th scope="col">Sock</th><th scope="col">Pairs</th><th scope="col">Revenue</th></tr></thead>
              <tbody>{s.topItems.map((i) => <tr key={i.sku}><td>{i.productName}<br /><span className="av-small av-muted">{i.sku}</span></td><td className="av-num">{i.pairsSold}</td><td className="av-num">{formatPrice(i.revenue)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="av-card-form" aria-labelledby="src-h">
          <h2 id="src-h" className="av-formtitle">Why lines got their price</h2>
          <table className="av-table">
            <thead><tr><th scope="col">Price</th><th scope="col">Order lines</th></tr></thead>
            <tbody>
              {s.discountSources.map((d) => (
                <tr key={d.source}><td>{d.source === "NONE" ? "Shop price" : d.source === "TIER" ? "Collection discount" : "Negotiated offer"}</td><td className="av-num">{d.lines}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="av-small">Revenue from negotiated lines: <strong className="av-num">{formatPrice(t.negotiatedRevenue)}</strong></p>
        </section>
      </div>
    </>
  );
}

/** Offers per day: one series, so no legend; the title names it. Hover a bar for the day; the table below has every number. */
function OffersChart({ s }: { s: NegotiationStats }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...s.perDay.map((d) => d.offers));
  const W = 720, H = 180, pad = 24, gap = 2;
  const bw = (W - pad) / s.perDay.length - gap;
  const y = (n: number) => H - pad - (n / max) * (H - pad * 2);
  const day = hover != null ? s.perDay[hover] : null;
  return (
    <section className="av-card-form" aria-labelledby="chart-h">
      <h2 id="chart-h" className="av-formtitle">Offers per day</h2>
      <div className="av-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Offers per day over the last ${s.days} days, at most ${max} in a day`} onMouseLeave={() => setHover(null)}>
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
            <span className="av-num">{day.offers} offers · {day.offersUsed} became orders · {day.limitedByShop} cut by the limit</span>
            <span className="av-num">average discount {pct(day.averageDiscountPct)}</span>
          </div>
        )}
      </div>
      <details>
        <summary className="av-small">Show the numbers as a table</summary>
        <table className="av-table">
          <thead><tr><th scope="col">Day</th><th scope="col">Offers</th><th scope="col">Became orders</th><th scope="col">Cut by the limit</th><th scope="col">Average discount</th></tr></thead>
          <tbody>{s.perDay.filter((d) => d.offers > 0).map((d) => <tr key={d.date}><td>{d.date}</td><td className="av-num">{d.offers}</td><td className="av-num">{d.offersUsed}</td><td className="av-num">{d.limitedByShop}</td><td className="av-num">{pct(d.averageDiscountPct)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

/** The rule-based against AI comparison for the evaluation chapter, with the source of the AI answers stated first. */
function Comparison() {
  const report = useAsync(() => adminEvaluation(), []);
  if (report.loading && !report.data) return <Skeleton height={200} />;
  if (report.error || !report.data) return <Alert tone="danger">{report.error?.message ?? "Could not load the comparison."}</Alert>;
  const r: EvaluationReport = report.data;
  return (
    <section className="av-card-form" aria-labelledby="eval-h">
      <h2 id="eval-h" className="av-formtitle">Rule-based assistant against the AI assistant</h2>
      <Alert>{r.aiSource === "SCRIPTED" ? <><strong>Scripted AI answers.</strong> {r.note}</> : r.note}</Alert>
      <table className="av-table">
        <thead><tr><th scope="col"></th><th scope="col">Rule-based</th><th scope="col">AI ({r.aiSource.toLowerCase()})</th></tr></thead>
        <tbody>
          <tr><th scope="row">Average discount given</th><td className="av-num">{pct(r.rule.averageFinalPct)}</td><td className="av-num">{pct(r.ai.averageFinalPct)}</td></tr>
          <tr><th scope="row">Customers who would buy</th><td className="av-num">{pct(r.rule.acceptedPct)}</td><td className="av-num">{pct(r.ai.acceptedPct)}</td></tr>
          <tr><th scope="row">Times the limit stepped in</th><td className="av-num">{r.rule.limited}</td><td className="av-num">{r.ai.limited}</td></tr>
          <tr><th scope="row">Prices below the limit</th><td><Badge tone={r.rule.aboveLimit === 0 ? "success" : "danger"}>{r.rule.aboveLimit}</Badge></td><td><Badge tone={r.ai.aboveLimit === 0 ? "success" : "danger"}>{r.ai.aboveLimit}</Badge></td></tr>
          <tr><th scope="row">Revenue from those who buy</th><td className="av-num">{formatPrice(r.rule.revenue)}</td><td className="av-num">{formatPrice(r.ai.revenue)}</td></tr>
        </tbody>
      </table>
      <details>
        <summary className="av-small">Show all {r.rows.length} customers</summary>
        <div className="av-tablewrap">
          <table className="av-table">
            <thead><tr><th scope="col">Customer</th><th scope="col">Message</th><th scope="col">Pairs</th><th scope="col">Limit</th><th scope="col">Rule-based</th><th scope="col">AI</th></tr></thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.customer}</td><td className="av-small">{x.message}</td><td className="av-num">{x.quantity}</td><td className="av-num">{pct(x.limitPct)}</td>
                  <td className="av-num">{pct(x.rule.proposedPct)} → {pct(x.rule.finalPct)}{x.rule.limited && " (cut)"}{x.rule.accepted ? " ✓" : ""}</td>
                  <td className="av-num">{pct(x.ai.proposedPct)} → {pct(x.ai.finalPct)}{x.ai.limited && " (cut)"}{x.ai.accepted ? " ✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
