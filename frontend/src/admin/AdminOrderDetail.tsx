import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { adminCancelOrder, adminFulfilOrder, adminGetOrder } from "../api/endpoints";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { ProductImage } from "../components/ProductImage";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatPrice } from "../lib/format";
import { useT } from "../i18n/I18n";

export function AdminOrderDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { t } = useT();
  const order = useAsync(() => adminGetOrder(id), [id]);
  const [confirm, setConfirm] = useState<"cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.loading && !order.data) return <Skeleton height={300} />;
  if (order.error || !order.data) return <Alert tone="danger">{order.error?.message ?? t("a.od.notFound")} <Link to="/admin/orders">{t("a.od.back")}</Link></Alert>;
  const o = order.data;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(null);
    try { await action(); toast(done); order.reload(); } catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.generic")); }
    finally { setBusy(false); setConfirm(null); }
  }

  return (
    <>
      <nav className="av-crumbs" aria-label={t("a.crumbs")}><Link to="/admin/orders">{t("a.nav.orders")}</Link><span aria-hidden="true">/</span><span>{o.reference}</span></nav>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{formatDateTime(o.createdAt)}</span><h1>{t("a.od.title", { ref: o.reference })}</h1></div>
        <div className="av-row">
          <OrderStatusBadge status={o.status} />
          {o.status === "PAID" && <Button loading={busy} onClick={() => run(() => adminFulfilOrder(o.id), t("a.od.completedToast"))}>{t("a.od.complete")}</Button>}
          {(o.status === "PAID" || o.status === "PENDING") && <Button variant="secondary" onClick={() => setConfirm("cancel")}>{t("a.od.cancel")}</Button>}
        </div>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="av-card-form">
        <h2 className="av-formtitle">{t("a.orders.customer")}</h2>
        <p>{o.customerEmail}<br />{o.fulfillment.contactName}, {o.fulfillment.contactPhone}</p>
        <p><strong>{o.fulfillment.method === "PICKUP" ? t("a.od.pickup") : t("a.od.delivery")}</strong>{o.fulfillment.address ? `: ${o.fulfillment.address}` : ""}{o.fulfillment.note ? <><br />{t("a.od.note")}: {o.fulfillment.note}</> : null}</p>
        <p className="av-small av-muted">{o.payment ? t("a.od.paidWith", { method: o.payment.method === "APPLE_PAY" ? "Apple Pay" : "Google Pay", ref: o.payment.reference }) : t("a.od.notPaid")}{o.paidAt ? `, ${formatDateTime(o.paidAt)}` : ""}</p>
      </div>
      <div className="av-card-form">
        <h2 className="av-formtitle">{t("a.orders.items")}</h2>
        <ul className="av-cartlines">
          {o.items.map((i) => (
            <li key={i.sku} className="av-cartline av-cartline--static">
              <span className="av-cartline__img"><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>
              <div className="av-cartline__body"><span className="av-cartline__name">{i.productName}</span>
                <span className="av-small av-muted">{i.variantLabel} · {i.sku}</span>
                <span className="av-small">{i.quantity} × {formatPrice(i.unitPrice)}{i.discountPct > 0 ? ` (${t("a.od.discounted", { price: formatPrice(i.listPrice), pct: i.discountPct })})` : ""}</span></div>
              <div className="av-cartline__total av-price">{formatPrice(i.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <p className="av-price av-price--lg">{t("a.orders.total")} {formatPrice(o.total)}</p>
      </div>

      <Dialog open={confirm === "cancel"} title={t("a.od.cancelQ")} onClose={() => setConfirm(null)}
              actions={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t("a.keep")}</Button><Button loading={busy} onClick={() => run(() => adminCancelOrder(o.id), t("a.od.cancelledToast"))}>{t("a.od.cancel")}</Button></>}>
        <p>{t("a.od.cancelBody", { total: formatPrice(o.total) })}</p>
      </Dialog>
    </>
  );
}
