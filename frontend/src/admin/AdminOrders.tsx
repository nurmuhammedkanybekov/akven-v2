import { Link, useSearchParams } from "react-router-dom";
import { adminListOrders } from "../api/endpoints";
import type { OrderStatus } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatPrice } from "../lib/format";
import { useT } from "../i18n/I18n";

const TABS = [["PAID", "a.orders.toFulfil"], ["FULFILLED", "a.orders.completed"], ["CANCELLED", "a.orders.cancelled"], ["", "a.all"]] as const;

export function AdminOrders() {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "PAID") as OrderStatus | "";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const list = useAsync(() => adminListOrders({ status: status || undefined, page, pageSize: 20 }), [status, page]);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(params); v === null ? n.delete(k) : n.set(k, v); if (k !== "page") n.delete("page"); setParams(n); };

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.sales")}</span><h1>{t("a.nav.orders")}</h1></div></header>
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
        {TABS.map(([v, l]) => <button key={v || "all"} type="button" className="av-tabbtn" aria-pressed={status === v} onClick={() => set("status", v === "PAID" ? null : v || "")}>{t(l)}</button>)}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <div className="av-empty"><h2>{status === "PAID" ? t("a.orders.nothingWaiting") : t("a.orders.none")}</h2></div>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">{t("a.nav.orders")}</caption>
            <thead><tr><th scope="col">{t("a.orders.order")}</th><th scope="col">{t("a.orders.customer")}</th><th scope="col">{t("a.orders.items")}</th><th scope="col">{t("a.orders.total")}</th><th scope="col">{t("a.status")}</th></tr></thead>
            <tbody>
              {list.data.items.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}><strong>{o.reference}</strong></Link><br /><span className="av-small av-muted">{formatDateTime(o.createdAt)}</span></td>
                  <td>{o.customerEmail}<br /><span className="av-small av-muted">{o.fulfillment.contactName}, {o.fulfillment.contactPhone}</span></td>
                  <td className="av-small">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</td>
                  <td className="av-price">{formatPrice(o.total)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={(p) => set("page", p === 0 ? null : String(p))} />}
    </>
  );
}
