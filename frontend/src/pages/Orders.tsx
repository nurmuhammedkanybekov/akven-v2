import { Link } from "react-router-dom";
import { listMyOrders } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatPrice } from "../lib/format";

export function OrdersPage() {
  const { session, signOut } = useAuth();
  const orders = useAsync(() => listMyOrders(), []);
  return (
    <div className="av-container av-page">
      <header className="av-page__head">
        <span className="av-eyebrow">{session?.email}</span>
        <h1>Your orders</h1>
      </header>
      {orders.loading && !orders.data && <Skeleton height={96} />}
      {orders.error && <Alert tone="danger">{orders.error.message}</Alert>}
      {orders.data && orders.data.length === 0 && (
        <div className="av-empty"><h2>No orders yet</h2><p className="av-lead">When you buy something, it will appear here.</p><Button to="/shop">Browse the socks</Button></div>
      )}
      {orders.data && orders.data.length > 0 && (
        <ul className="av-orderlist">
          {orders.data.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="av-ordercard">
                <div><strong>{o.reference}</strong><br /><span className="av-small av-muted">{formatDateTime(o.createdAt)}</span></div>
                <div className="av-small">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</div>
                <OrderStatusBadge status={o.status} />
                <span className="av-price">{formatPrice(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="av-row" style={{ marginTop: "var(--space-7)" }}><Button variant="ghost" onClick={signOut}>Sign out</Button></div>
    </div>
  );
}
