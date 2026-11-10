import { useState } from "react";
import { useMoney } from "../shop/useMoney";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { adminCancelOrder, adminFulfilOrder, adminGetOrder } from "../api/endpoints";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { ProductImage } from "../components/ProductImage";
import { GiftSummary } from "../components/GiftSummary";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import { useT } from "../i18n/I18n";
import { OrderEmails } from "./AdminEmails";

export function AdminOrderDetail() {
  const { money: formatPrice } = useMoney();
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
          {o.status === "RESERVED" && <Button loading={busy} onClick={() => run(() => adminFulfilOrder(o.id), t("a.od.completedToast"))}>{t("a.od.paidAndHanded", { total: formatPrice(o.total) })}</Button>}
          {(o.status === "PAID" || o.status === "PENDING" || o.status === "RESERVED") && <Button variant="secondary" onClick={() => setConfirm("cancel")}>{t("a.od.cancel")}</Button>}
        </div>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="av-odfacts">
        <section className="av-card-form" aria-label={t("a.orders.customer")}>
          <span className="av-eyebrow">{t("a.orders.customer")}</span>
          <p className="av-odfacts__big">{o.fulfillment.contactName}{o.guest && <> <Badge tone="warning">{t("a.orders.guest")}</Badge></>}</p>
          <p className="av-small">{o.customerEmail}</p>
          <div className="av-row">
            <Button size="sm" variant="secondary" href={`tel:${o.fulfillment.contactPhone.replace(/[^+\d]/g, "")}`}>📞 {o.fulfillment.contactPhone}</Button>
            <Button size="sm" variant="ghost" href={`https://wa.me/${o.fulfillment.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`AK&VEN · ${o.reference}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
          </div>
        </section>
        <section className="av-card-form" aria-label={t("a.orders.way")}>
          <span className="av-eyebrow">{t("a.orders.way")}</span>
          <p className="av-odfacts__big">{o.fulfillment.method === "PICKUP" ? `🏪 ${t("co.pickup")}` : o.fulfillment.delivery?.kind === "CARGO" ? `🚌 ${t("co.cargo")}` : `🚕 ${t("co.courier")}`}</p>
          {o.fulfillment.delivery && <p className="av-small">{o.fulfillment.delivery.zone} · {o.fulfillment.delivery.fee === 0 ? t("co.free") : formatPrice(o.fulfillment.delivery.fee)}
            {o.fulfillment.delivery.daysMin != null && <> · {t("co.days", { min: o.fulfillment.delivery.daysMin, max: o.fulfillment.delivery.daysMax ?? o.fulfillment.delivery.daysMin })}</>}
            {o.fulfillment.delivery.payOnReceipt && <><br />{t("co.carrierOnReceipt")}</>}</p>}
          {o.fulfillment.address && <p className="av-small"><strong>{o.fulfillment.address}</strong></p>}
          {o.fulfillment.note && <p className="av-small">{t("a.od.note")}: {o.fulfillment.note}</p>}
        </section>
        <section className="av-card-form" aria-label={t("a.od.timeline")}>
          <span className="av-eyebrow">{t("a.od.timeline")}</span>
          <ol className="av-odtime">
            <li className="is-done"><span>{t("a.od.placed")}</span><span className="av-small">{formatDateTime(o.createdAt)}</span></li>
            <li className={o.paidAt ? "is-done" : undefined}><span>{t("a.od.paid")}</span><span className="av-small">{o.paidAt ? formatDateTime(o.paidAt) : "—"}</span>
              {o.payment && <span className="av-small av-muted">{(o.payment.method === "APPLE_PAY" ? "Apple Pay" : "Google Pay") + (o.payment.simulated ? ` (${t("pay.demoTag")})` : "")} · {o.payment.reference}</span>}</li>
            {o.cancelledAt ? <li className="is-cancelled"><span>{t("a.od.cancelledStep")}</span><span className="av-small">{formatDateTime(o.cancelledAt)}</span></li>
              : <li className={o.fulfilledAt ? "is-done" : undefined}><span>{o.fulfillment.method === "PICKUP" ? t("a.od.collected") : t("a.od.sent")}</span><span className="av-small">{o.fulfilledAt ? formatDateTime(o.fulfilledAt) : "—"}</span></li>}
          </ol>
        </section>
      </div>
      {o.gift && (
        <div className="av-card-form av-card-form--gift">
          <h2 className="av-formtitle">{t("a.od.gift")}</h2>
          <GiftSummary gift={o.gift} />
        </div>
      )}
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

      <OrderEmails key={`${o.id}-${o.status}`} orderId={o.id} />

      <Dialog open={confirm === "cancel"} title={t("a.od.cancelQ")} onClose={() => setConfirm(null)}
              actions={<><Button variant="ghost" onClick={() => setConfirm(null)}>{t("a.keep")}</Button><Button loading={busy} onClick={() => run(() => adminCancelOrder(o.id), t("a.od.cancelledToast"))}>{t("a.od.cancel")}</Button></>}>
        <p>{t("a.od.cancelBody", { total: formatPrice(o.total) })}</p>
      </Dialog>
    </>
  );
}
