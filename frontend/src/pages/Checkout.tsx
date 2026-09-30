import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { checkout } from "../api/endpoints";
import type { FulfillmentMethod, PaymentMethod } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useQuote } from "../cart/useQuote";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Field";
import { WalletSheet } from "../components/WalletSheet";
import { formatPrice } from "../lib/format";
import { newId } from "../lib/ids";
import { newWalletToken } from "../lib/wallet";

/**
 * One page: who to contact, how you get it, what it costs (from the server, never from the browser), and two wallet
 * buttons. Each attempt carries a fresh Idempotency-Key, so a double click or a retry can never pay twice.
 */
export function CheckoutPage() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { quote, loading, offline } = useQuote(cart.lines, session?.email ?? null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod>("PICKUP");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once an order is placed. An empty bag must mean "nothing to buy" only while we have not just bought it:
  // the router defers navigation, so without this the empty-bag redirect would beat the move to the confirmation page.
  const [placed, setPlaced] = useState(false);
  const attemptKey = useRef(newId());

  if (cart.lines.length === 0 && !placed) return <Navigate to="/cart" replace />;
  const total = quote?.total ?? cart.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Tell us who to ask for.";
    if (!/^[0-9+()\-\s]{6,40}$/.test(phone.trim())) errs.phone = "Enter a phone number we can reach you on.";
    if (method === "DELIVERY" && !address.trim()) errs.address = "Enter the delivery address, or choose pickup.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function choose(pay: PaymentMethod, e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (validate()) setSheet(pay);
  }

  async function pay(payment: PaymentMethod, declined: boolean) {
    setBusy(true); setError(null);
    try {
      const order = await checkout({
        items: cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity, negotiationSessionId: l.negotiationSessionId })),
        fulfillment: { method, contactName: name.trim(), contactPhone: phone.trim(), address: method === "DELIVERY" ? address.trim() : null, note: note.trim() || null },
        payment: { method: payment, token: newWalletToken(payment, declined) },
      }, attemptKey.current);
      setPlaced(true);
      cart.clear();
      navigate(`/orders/${order.id}`, { replace: true, state: { justPaid: true } });
    } catch (e) {
      setSheet(null);
      const api = e instanceof ApiError ? e : null;
      // Only a lost connection may reuse the key: the request might have gone through. Every answer from the server is final for its key.
      if (!api || api.status !== 0) attemptKey.current = newId();
      setError(api ? api.message : "Something went wrong. Please try again.");
      if (api?.fieldErrors) setFieldErrors(Object.fromEntries(Object.entries(api.fieldErrors).map(([k, v]) => [k.split(".").pop()!, v])));
    } finally { setBusy(false); }
  }

  return (
    <div className="av-container av-page">
      <header className="av-page__head"><span className="av-eyebrow">Checkout</span><h1>Almost there</h1></header>
      {offline && <Alert tone="danger">You are offline. Reconnect to place your order.</Alert>}
      {error && <Alert tone="danger">{error} {error.match(/left|sold out|no longer/i) && <Link to="/cart">Review your bag</Link>}</Alert>}
      {quote && !quote.canCheckout && <Alert tone="danger">Something in your bag changed. <Link to="/cart">Review your bag</Link> before paying.</Alert>}

      <div className="av-cart">
        <form className="av-card-form" noValidate onSubmit={(e) => choose("APPLE_PAY", e)} aria-label="Contact and delivery">
          <h2 className="av-formtitle">Contact</h2>
          <div className="av-formgrid">
            <Input label="Name" autoComplete="name" value={name} error={fieldErrors.name ?? fieldErrors.contactName} onChange={(e) => setName(e.target.value)} />
            <Input label="Phone" type="tel" autoComplete="tel" value={phone} error={fieldErrors.phone ?? fieldErrors.contactPhone} hint="Only used about this order." onChange={(e) => setPhone(e.target.value)} />
          </div>

          <fieldset className="av-option">
            <legend className="av-label">How would you like to receive it?</legend>
            <div className="av-row" role="radiogroup" aria-label="Fulfilment">
              <label className="av-radiocard"><input type="radio" name="fulfilment" checked={method === "PICKUP"} onChange={() => setMethod("PICKUP")} /><span><strong>Pick up</strong><br /><span className="av-small">Collect from our shop in Bishkek</span></span></label>
              <label className="av-radiocard"><input type="radio" name="fulfilment" checked={method === "DELIVERY"} onChange={() => setMethod("DELIVERY")} /><span><strong>Delivery</strong><br /><span className="av-small">We bring it to you</span></span></label>
            </div>
          </fieldset>
          {method === "DELIVERY" && <Textarea label="Delivery address" rows={2} value={address} error={fieldErrors.address} onChange={(e) => setAddress(e.target.value)} />}
          <Textarea label="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

          <h2 className="av-formtitle">Payment</h2>
          <p className="av-small">Pay with your phone's wallet. We never see or store card details.</p>
          <div className="av-row">
            <Button size="lg" type="button" onClick={() => choose("APPLE_PAY")} disabled={!quote?.canCheckout || offline || busy}>Pay with Apple Pay</Button>
            <Button size="lg" type="button" variant="secondary" onClick={() => choose("GOOGLE_PAY")} disabled={!quote?.canCheckout || offline || busy}>Pay with Google Pay</Button>
          </div>
        </form>

        <aside className="av-summary" aria-label="Order summary">
          <h2>Your order</h2>
          {loading && !quote ? <Skeleton height={80} /> : (
            <ul className="av-minilines">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.sku}>
                  <span>{l.quantity} × {l.productName}<br /><span className="av-small av-muted">{l.variantLabel}{l.discountPct ? ` · ${l.discountPct}% off` : ""}</span></span>
                  <span className="av-price">{l.lineTotal != null ? formatPrice(l.lineTotal) : "–"}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="av-totals"><div className="av-totals__grand"><dt>Total</dt><dd className="av-price av-price--lg">{formatPrice(total)}</dd></div></dl>
        </aside>
      </div>

      <WalletSheet method={sheet} total={total} busy={busy} onCancel={() => setSheet(null)} onConfirm={pay} />
    </div>
  );
}
