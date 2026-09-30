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

export function AdminOrderDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const order = useAsync(() => adminGetOrder(id), [id]);
  const [confirm, setConfirm] = useState<"cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.loading && !order.data) return <Skeleton height={300} />;
  if (order.error || !order.data) return <Alert tone="danger">{order.error?.message ?? "Order not found."} <Link to="/admin/orders">Back to orders</Link></Alert>;
  const o = order.data;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(null);
    try { await action(); toast(done); order.reload(); } catch (e) { setError(e instanceof ApiError ? e.message : "That did not work. Try again."); }
    finally { setBusy(false); setConfirm(null); }
  }

  return (
    <>
      <nav className="av-crumbs" aria-label="Breadcrumb"><Link to="/admin/orders">Orders</Link><span aria-hidden="true">/</span><span>{o.reference}</span></nav>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{formatDateTime(o.createdAt)}</span><h1>Order {o.reference}</h1></div>
        <div className="av-row">
          <OrderStatusBadge status={o.status} />
          {o.status === "PAID" && <Button loading={busy} onClick={() => run(() => adminFulfilOrder(o.id), "Marked as completed")}>Mark as completed</Button>}
          {(o.status === "PAID" || o.status === "PENDING") && <Button variant="secondary" onClick={() => setConfirm("cancel")}>Cancel and refund</Button>}
        </div>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="av-card-form">
        <h2 className="av-formtitle">Customer</h2>
        <p>{o.customerEmail}<br />{o.fulfillment.contactName}, {o.fulfillment.contactPhone}</p>
        <p><strong>{o.fulfillment.method === "PICKUP" ? "Pick up" : "Delivery"}</strong>{o.fulfillment.address ? `: ${o.fulfillment.address}` : ""}{o.fulfillment.note ? <><br />Note: {o.fulfillment.note}</> : null}</p>
        <p className="av-small av-muted">{o.payment ? `Paid with ${o.payment.method === "APPLE_PAY" ? "Apple Pay" : "Google Pay"} (${o.payment.reference})` : "Not paid"}{o.paidAt ? `, ${formatDateTime(o.paidAt)}` : ""}</p>
      </div>
      <div className="av-card-form">
        <h2 className="av-formtitle">Items</h2>
        <ul className="av-cartlines">
          {o.items.map((i) => (
            <li key={i.sku} className="av-cartline av-cartline--static">
              <span className="av-cartline__img"><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>
              <div className="av-cartline__body"><span className="av-cartline__name">{i.productName}</span>
                <span className="av-small av-muted">{i.variantLabel} · {i.sku}</span>
                <span className="av-small">{i.quantity} × {formatPrice(i.unitPrice)}{i.discountPct > 0 ? ` (negotiated: ${formatPrice(i.listPrice)} less ${i.discountPct}%)` : ""}</span></div>
              <div className="av-cartline__total av-price">{formatPrice(i.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <p className="av-price av-price--lg">Total {formatPrice(o.total)}</p>
      </div>

      <Dialog open={confirm === "cancel"} title="Cancel this order?" onClose={() => setConfirm(null)}
              actions={<><Button variant="ghost" onClick={() => setConfirm(null)}>Keep it</Button><Button loading={busy} onClick={() => run(() => adminCancelOrder(o.id), "Order cancelled and refunded")}>Cancel and refund</Button></>}>
        <p>The payment of {formatPrice(o.total)} is returned to the customer and the socks go back into stock.</p>
      </Dialog>
    </>
  );
}
