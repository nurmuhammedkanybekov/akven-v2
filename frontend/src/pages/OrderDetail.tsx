import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { cancelMyOrder, getMyOrder, getProduct } from "../api/endpoints";
import type { OrderView } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { ProductImage } from "../components/ProductImage";
import { QrCode, pickupQrText } from "../components/QrCode";
import { useToast } from "../components/Toast";
import { useCart } from "../cart/CartContext";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { formatDateTime } from "../lib/format";
import { useMoney } from "../shop/useMoney";
import { NotFoundPage } from "./NotFound";

export function OrderDetailPage() {
  const { money } = useMoney();
  const { id = "" } = useParams();
  const justPaid = Boolean((useLocation().state as { justPaid?: boolean } | null)?.justPaid);
  const toast = useToast();
  const { t } = useT();
  const order = useAsync(() => getMyOrder(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.loading && !order.data) return <div className="av-container av-page"><Skeleton height={320} /></div>;
  if (order.error instanceof ApiError && order.error.status === 404) return <NotFoundPage what="That order" />;
  if (order.error || !order.data) return <div className="av-container av-page"><Alert tone="danger">{order.error?.message ?? "Could not load the order."}</Alert></div>;
  const o = order.data;

  async function cancel() {
    setBusy(true); setError(null);
    try { await cancelMyOrder(o.id); toast(o.status === "PAID" ? "Order cancelled. Your payment will be returned." : "Order cancelled."); order.reload(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not cancel the order."); }
    finally { setBusy(false); setConfirm(false); }
  }

  return (
    <div className="av-container av-page">
      <nav className="av-crumbs" aria-label="Breadcrumb"><Link to="/orders">Your orders</Link><span aria-hidden="true">/</span><span>{o.reference}</span></nav>
      {justPaid && o.status === "PAID" && (
        <Alert tone="success">Thank you! Your order {o.reference} is paid. We will contact you on {o.fulfillment.contactPhone} about {o.fulfillment.method === "PICKUP" ? "collecting it" : "delivery"}.</Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <header className="av-admin__head">
        <div><span className="av-eyebrow">Ordered {formatDateTime(o.createdAt)}</span><h1>Order {o.reference}</h1></div>
        <OrderStatusBadge status={o.status} />
      </header>

      {o.pickup?.code && o.status === "PAID" && <PickupCode code={o.pickup.code} point={o.pickup.point} />}

      <div className="av-cart">
        <ul className="av-cartlines">
          {o.items.map((i) => (
            <li key={i.sku} className="av-cartline av-cartline--static">
              <span className="av-cartline__img"><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>
              <div className="av-cartline__body">
                {i.productSlug ? <Link to={`/products/${i.productSlug}`} className="av-cartline__name">{i.productName}</Link> : <span className="av-cartline__name">{i.productName}</span>}
                <span className="av-small av-muted">{i.colorHex && <span className="av-dot" style={{ background: i.colorHex }} />} {i.variantLabel}</span>
                <span className="av-small">{i.quantity} × {money(i.unitPrice)}{i.discountPct > 0 ? ` (${money(i.listPrice)} less ${i.discountPct}%)` : ""}</span>
              </div>
              <div className="av-cartline__total av-price">{money(i.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <aside className="av-summary">
          <h2>Details</h2>
          <dl className="av-specs">
            <div><dt className="av-eyebrow">Total</dt><dd className="av-price av-price--lg">{money(o.total)}</dd></div>
            <div><dt className="av-eyebrow">{o.fulfillment.method === "PICKUP" ? "Pick up" : "Delivery"}</dt><dd>{o.fulfillment.contactName}, {o.fulfillment.contactPhone}{o.fulfillment.address ? <><br />{o.fulfillment.address}</> : null}</dd></div>
            {o.fulfillment.country && <div><dt className="av-eyebrow">{t("order.country")}</dt><dd>{t(`country.${o.fulfillment.country}` as MessageKey)}</dd></div>}
            {o.fulfillment.note && <div><dt className="av-eyebrow">Note</dt><dd>{o.fulfillment.note}</dd></div>}
            {o.payment && <div><dt className="av-eyebrow">Paid with</dt><dd>{o.payment.method === "APPLE_PAY" ? "Apple Pay" : "Google Pay"} <span className="av-small av-muted">{o.payment.reference}</span></dd></div>}
            {o.fulfilledAt && <div><dt className="av-eyebrow">Completed</dt><dd>{formatDateTime(o.fulfilledAt)}</dd></div>}
            {o.cancelledAt && <div><dt className="av-eyebrow">Cancelled</dt><dd>{formatDateTime(o.cancelledAt)}</dd></div>}
          </dl>
          <OrderAgain order={o} />
          {(o.status === "PAID" || o.status === "PENDING") && <Button variant="secondary" onClick={() => setConfirm(true)}>Cancel this order</Button>}
        </aside>
      </div>

      <Dialog open={confirm} title="Cancel this order?" onClose={() => setConfirm(false)}
              actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>Keep it</Button><Button loading={busy} onClick={cancel}>Cancel the order</Button></>}>
        <p>{o.status === "PAID" ? "Your payment will be returned and the socks go back on the shelf." : "The socks go back on the shelf."} You can place a new order any time.</p>
      </Dialog>
    </div>
  );
}

/** The six digits to say at the stall, large enough to read across a counter, with where to collect. */
function PickupCode({ code, point }: { code: string; point: NonNullable<OrderView["pickup"]>["point"] }) {
  const { t } = useT();
  return (
    <section className="av-deep av-pickup" aria-label={t("order.pickupTitle")}>
      <div className="av-stack">
        <span className="av-eyebrow">{t("order.pickupTitle")}</span>
        <strong className="av-pickup__code av-num" aria-label={code.split("").join(" ")}>{code.slice(0, 3)} {code.slice(3)}</strong>
        <p>{t("order.pickupLead")}</p>
      </div>
      <figure className="av-pickup__qr">
        <QrCode text={pickupQrText(code)} label={t("order.qrLabel", { code })} />
        <figcaption className="av-small">{t("order.qrNote")}</figcaption>
      </figure>
      {point && (
        <div className="av-stack">
          <span className="av-eyebrow">{t("order.pickupAt")}</span>
          <p>{[point.market, point.section, point.passage && `${t("visit.passage")} ${point.passage}`, `${t("visit.container")} ${point.container}`].filter(Boolean).join(", ")}</p>
          {point.hours && <p>{point.hours}</p>}
        </div>
      )}
    </section>
  );
}

/**
 * The same socks again, in one tap: every line goes back into the bag at today's price, as many as are in stock now.
 * Lines that are sold out or no longer sold are named, so nothing disappears silently.
 */
function OrderAgain({ order }: { order: OrderView }) {
  const { t } = useT();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function again() {
    setBusy(true);
    let added = 0;
    const missing: string[] = [];
    for (const item of order.items) {
      try {
        if (!item.productSlug) throw new Error("gone");
        const product = await getProduct(item.productSlug);
        const v = product.variants.find((x) => x.sku === item.sku);
        if (!v || v.availableQty <= 0) throw new Error("out");
        const picture = product.images.find((i) => i.color && i.color === v.color) ?? product.images[0];
        cart.add({ sku: v.sku, productSlug: product.slug, productName: product.name, variantLabel: item.variantLabel, colorHex: v.colorHex,
          imageUrl: picture?.url ?? null, unitPrice: v.price }, Math.min(item.quantity, v.availableQty), v.availableQty);
        added++;
      } catch { missing.push(item.productName); }
    }
    setBusy(false);
    if (added) toast(missing.length ? t("again.partly", { names: missing.join(", ") }) : t("again.done"));
    else toast(t("again.none"), "danger");
    if (added) navigate("/cart");
  }
  return <Button variant="primary" block loading={busy} onClick={() => void again()}>{t("again.cta")}</Button>;
}
