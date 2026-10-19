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
import { Confetti } from "../components/Confetti";
import { GiftSummary } from "../components/GiftSummary";

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
  if (order.error instanceof ApiError && order.error.status === 404) return <NotFoundPage kind="order" />;
  if (order.error || !order.data) return <div className="av-container av-page"><Alert tone="danger">{order.error?.message ?? t("od.loadError")}</Alert></div>;
  const o = order.data;

  async function cancel() {
    setBusy(true); setError(null);
    try { await cancelMyOrder(o.id); toast(o.status === "PAID" ? t("od.cancelledPaid") : t("od.cancelled")); order.reload(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t("od.cancelError")); }
    finally { setBusy(false); setConfirm(false); }
  }

  return (
    <div className="av-container av-page">
      {justPaid && o.status === "PAID" && <Confetti />}
      <nav className="av-crumbs" aria-label={t("pdp.crumbs")}><Link to="/orders">{t("od.yours")}</Link><span aria-hidden="true">/</span><span>{o.reference}</span></nav>
      {justPaid && o.status === "PAID" && (
        <Alert tone="success">{t(o.fulfillment.method === "PICKUP" ? "od.thanksPickup" : "od.thanksDelivery", { ref: o.reference, phone: o.fulfillment.contactPhone })}</Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("od.ordered", { when: formatDateTime(o.createdAt) })}</span><h1>{t("od.title", { ref: o.reference })}</h1></div>
        <OrderStatusBadge status={o.status} />
      </header>
      <Timeline order={o} />

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
          <h2>{t("od.details")}</h2>
          <dl className="av-specs">
            <div><dt className="av-eyebrow">{t("cart.total")}</dt><dd className="av-price av-price--lg">{money(o.total)}</dd></div>
            <div><dt className="av-eyebrow">{o.fulfillment.method === "PICKUP" ? t("co.pickup") : t("co.delivery")}</dt><dd>{o.fulfillment.contactName}, {o.fulfillment.contactPhone}{o.fulfillment.address ? <><br />{o.fulfillment.address}</> : null}</dd></div>
            {o.fulfillment.country && <div><dt className="av-eyebrow">{t("order.country")}</dt><dd>{t(`country.${o.fulfillment.country}` as MessageKey)}</dd></div>}
            {o.fulfillment.note && <div><dt className="av-eyebrow">{t("od.note")}</dt><dd>{o.fulfillment.note}</dd></div>}
            {o.payment && <div><dt className="av-eyebrow">{t("od.paidWith")}</dt><dd>{o.payment.method === "APPLE_PAY" ? "Apple Pay" : "Google Pay"} <span className="av-small av-muted">{o.payment.reference}</span></dd></div>}
            {o.fulfilledAt && <div><dt className="av-eyebrow">{t("od.completed")}</dt><dd>{formatDateTime(o.fulfilledAt)}</dd></div>}
            {o.cancelledAt && <div><dt className="av-eyebrow">{t("od.cancelledAt")}</dt><dd>{formatDateTime(o.cancelledAt)}</dd></div>}
          </dl>
          {o.gift && <GiftSummary gift={o.gift} />}
          <OrderAgain order={o} />
          {(o.status === "PAID" || o.status === "PENDING") && <Button variant="secondary" onClick={() => setConfirm(true)}>{t("od.cancel")}</Button>}
        </aside>
      </div>

      <Dialog open={confirm} title={t("od.cancelQ")} onClose={() => setConfirm(false)}
              actions={<><Button variant="ghost" onClick={() => setConfirm(false)}>{t("od.keep")}</Button><Button loading={busy} onClick={cancel}>{t("od.cancelIt")}</Button></>}>
        <p>{o.status === "PAID" ? t("od.cancelPaidS") : t("od.cancelS")}</p>
      </Dialog>
    </div>
  );
}

/**
 * Where the order is now, as four steps: placed, paid, ready (at the stall, or on its way), and handed over. The line
 * between the steps fills up to the current one; a cancelled order shows where it stopped.
 */
function Timeline({ order: o }: { order: OrderView }) {
  const { t } = useT();
  const pickup = o.fulfillment.method === "PICKUP";
  const steps: Array<{ key: MessageKey; at: string | null; done: boolean }> = o.status === "CANCELLED"
    ? [{ key: "od.stepPlaced", at: o.createdAt, done: true }, ...(o.paidAt ? [{ key: "od.stepPaid" as MessageKey, at: o.paidAt, done: true }] : []),
       { key: "od.stepCancelled", at: o.cancelledAt, done: true }]
    : [{ key: "od.stepPlaced", at: o.createdAt, done: true },
       { key: "od.stepPaid", at: o.paidAt, done: !!o.paidAt },
       { key: pickup ? "od.stepReady" : "od.stepOnWay", at: null, done: !!o.paidAt },
       { key: pickup ? "od.stepCollected" : "od.stepDelivered", at: o.fulfilledAt, done: !!o.fulfilledAt }];
  const reached = steps.filter((s) => s.done).length;
  return (
    <ol className={`av-timeline${o.status === "CANCELLED" ? " is-cancelled" : ""}`} aria-label={t("od.progress")}
        style={{ "--steps": steps.length, "--reached": reached } as React.CSSProperties}>
      {steps.map((s, i) => (
        <li key={s.key} className={s.done ? "is-done" : undefined} aria-current={i === reached - 1 ? "step" : undefined} style={{ "--i": i } as React.CSSProperties}>
          <span className="av-timeline__dot" aria-hidden="true" />
          <strong>{t(s.key)}</strong>
          {s.at && <span className="av-small av-muted">{formatDateTime(s.at)}</span>}
        </li>
      ))}
    </ol>
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
