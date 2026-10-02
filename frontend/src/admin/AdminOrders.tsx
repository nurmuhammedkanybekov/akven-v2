import { Link, useSearchParams } from "react-router-dom";
import { adminListOrders } from "../api/endpoints";
import type { OrderStatus } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatPrice } from "../lib/format";

const TABS: Array<[string, string]> = [["PAID", "To fulfil"], ["FULFILLED", "Completed"], ["CANCELLED", "Cancelled"], ["", "All"]];

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "PAID") as OrderStatus | "";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const list = useAsync(() => adminListOrders({ status: status || undefined, page, pageSize: 20 }), [status, page]);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(params); v === null ? n.delete(k) : n.set(k, v); if (k !== "page") n.delete("page"); setParams(n); };

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">Sales</span><h1>Orders</h1></div></header>
      <div className="av-tabs av-tabs--inline" role="group" aria-label="Show">
        {TABS.map(([v, l]) => <button key={v || "all"} type="button" className="av-tabbtn" aria-pressed={status === v} onClick={() => set("status", v === "PAID" ? null : v || "")}>{l}</button>)}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <div className="av-empty"><h2>{status === "PAID" ? "Nothing waiting to be fulfilled" : "No orders here"}</h2></div>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">Orders</caption>
            <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
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
