import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "../components/Badge";
import { ProductImage } from "../components/ProductImage";
import { useMoney } from "../shop/useMoney";
import { adminListOrders } from "../api/endpoints";
import type { OrderStatus, OrderView } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import { useT } from "../i18n/I18n";

type Way = "PICKUP" | "COURIER" | "CARGO";
const WAY_ICON: Record<Way, string> = { PICKUP: "🏪", COURIER: "🚕", CARGO: "🚌" };
const WAY_KEY = { PICKUP: "co.pickup", COURIER: "co.courier", CARGO: "co.cargo" } as const;
const wayOf = (o: OrderView): Way => o.fulfillment.method === "PICKUP" ? "PICKUP" : o.fulfillment.delivery?.kind === "CARGO" ? "CARGO" : "COURIER";

const TABS = [["PAID", "a.orders.toFulfil"], ["FULFILLED", "a.orders.completed"], ["CANCELLED", "a.orders.cancelled"], ["", "a.all"]] as const;

export function AdminOrders() {
  const { money: formatPrice } = useMoney();
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "PAID") as OrderStatus | "";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const way = params.get("way") ?? "";
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  useEffect(() => {
    const id = window.setTimeout(() => { if (q !== urlQ) set("q", q || null); }, 300);
    return () => window.clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useAsync(() => adminListOrders({ status: status || undefined, q: urlQ || undefined, way: way || undefined, page, pageSize: 20 }), [status, urlQ, way, page]);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(params); v === null ? n.delete(k) : n.set(k, v); if (k !== "page") n.delete("page"); setParams(n); };

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.sales")}</span><h1>{t("a.nav.orders")}</h1></div></header>
      <div className="av-row av-admin__tools">
        <div className="av-field av-admin__search">
          <label className="av-label" htmlFor="order-search">{t("a.orders.search")}</label>
          <input id="order-search" className="av-input" type="search" value={q} placeholder={t("a.orders.searchEg")} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
          {TABS.map(([v, l]) => <button key={v || "all"} type="button" className="av-tabbtn" aria-pressed={status === v} onClick={() => set("status", v === "PAID" ? null : v || "")}>{t(l)}</button>)}
        </div>
      </div>
      <div className="av-row av-admin__tools av-admin__tools--second">
        <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.orders.way")}>
          {(["", "PICKUP", "COURIER", "CARGO"] as const).map((w) => (
            <button key={w || "all"} type="button" className="av-tabbtn" aria-pressed={way === w} onClick={() => set("way", w || null)}>
              {w ? <><span aria-hidden="true">{WAY_ICON[w]} </span>{t(WAY_KEY[w])}</> : t("a.orders.anyWay")}
            </button>
          ))}
        </div>
        {list.data && <span className="av-small av-muted">{t("a.orders.count", { n: list.data.totalItems })}</span>}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <div className="av-empty"><h2>{status === "PAID" ? t("a.orders.nothingWaiting") : t("a.orders.none")}</h2></div>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">{t("a.nav.orders")}</caption>
            <thead><tr><th scope="col">{t("a.orders.order")}</th><th scope="col">{t("a.orders.customer")}</th><th scope="col">{t("a.orders.way")}</th><th scope="col">{t("a.orders.items")}</th><th scope="col">{t("a.orders.total")}</th><th scope="col">{t("a.status")}</th></tr></thead>
            <tbody>
              {list.data.items.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}><strong>{o.reference}</strong></Link><br /><span className="av-small av-muted">{formatDateTime(o.createdAt)}</span></td>
                  <td><strong>{o.fulfillment.contactName}</strong>{o.guest && <> <Badge tone="warning">{t("a.orders.guest")}</Badge></>}<br /><span className="av-small av-muted">{o.customerEmail}</span></td>
                  <td className="av-small"><span aria-hidden="true">{WAY_ICON[wayOf(o)]} </span>{t(WAY_KEY[wayOf(o)])}{o.fulfillment.delivery?.zone && <><br /><span className="av-muted">{o.fulfillment.delivery.zone}</span></>}</td>
                  <td>
                    <div className="av-orderthumbs">
                      {o.items.slice(0, 4).map((i) => <span key={i.sku} className="av-orderthumbs__img" title={`${i.quantity} × ${i.productName}`}><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>)}
                    </div>
                    <span className="av-small av-muted">{t("bag.pairs", { n: o.items.reduce((n, i) => n + i.quantity, 0) })} · {o.items.map((i) => i.productName).slice(0, 2).join(", ")}{o.items.length > 2 ? "…" : ""}</span>
                  </td>
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
