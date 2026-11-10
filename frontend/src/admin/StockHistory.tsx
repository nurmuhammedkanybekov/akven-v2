import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminStockHistory } from "../api/endpoints";
import type { StockMovement } from "../api/types";
import type { MessageKey } from "../i18n/en";
import { useT } from "../i18n/I18n";

/**
 * One variant's stock ledger, newest first: what changed, why, and what was left. Loaded only when opened, and again
 * whenever {@code refresh} changes (after a save on the same card).
 */
export function StockHistory({ variantId, refresh }: { variantId: string; refresh: number }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StockMovement[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setFailed(false);
    adminStockHistory(variantId).then((r) => { if (alive) setRows(r); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [open, variantId, refresh]);

  const when = new Intl.DateTimeFormat(lang === "ky" ? "ky-KG" : lang === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <details className="av-stockhist" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{t("a.v.history")}</summary>
      <p className="av-muted">{t("a.v.historyHint")}</p>
      {failed && <p role="alert">{t("a.err.generic")}</p>}
      {rows && rows.length === 0 && <p>{t("a.v.historyEmpty")}</p>}
      {rows && rows.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <thead><tr><th>{t("a.v.historyWhen")}</th><th>{t("a.v.historyChange")}</th><th>{t("a.v.historyWhy")}</th><th>{t("a.v.historyAfter")}</th><th>{t("a.v.historyWho")}</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>{when.format(new Date(m.at))}</td>
                  <td className={m.delta > 0 ? "av-stockhist__in" : "av-stockhist__out"}>{m.delta > 0 ? `+${m.delta}` : `−${-m.delta}`}</td>
                  <td>{t(`a.stock.${m.reason}` as MessageKey)}</td>
                  <td className="av-price">{m.stockAfter}</td>
                  <td>
                    {m.orderId && <Link to={`/admin/orders/${m.orderId}`}>{t("a.v.historyOrder")}</Link>}
                    {m.actor && <span>{m.actor}</span>}
                    {m.note && <span className="av-muted">{m.actor || m.orderId ? " · " : ""}{m.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
