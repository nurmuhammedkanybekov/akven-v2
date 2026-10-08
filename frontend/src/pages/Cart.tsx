import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MAX_PER_LINE, useCart, type CartLine } from "../cart/CartContext";
import { useQuote } from "../cart/useQuote";
import type { QuoteLine } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Price } from "../components/Price";
import { ProductImage } from "../components/ProductImage";
import { QuantityStepper } from "../components/QuantityStepper";
import { useT } from "../i18n/I18n";
import { formatPrice } from "../lib/format";
import type { CollectionView } from "../api/types";

/** The bag: what is in it, at today's prices, with honest notes about anything that changed. */
export function CartPage() {
  const cart = useCart();
  const { session } = useAuth();
  const { quote, loading, offline } = useQuote(cart.lines, session?.email ?? null);

  if (cart.lines.length === 0) {
    return (
      <div className="av-container av-page av-empty">
        <h1>Your bag is empty</h1>
        <p className="av-lead">Find a pair you like and it will wait for you here.</p>
        <Button to="/shop">Browse the socks</Button>
      </div>
    );
  }

  const rows = cart.lines.map((line) => ({ line, q: quote?.lines.find((l) => l.sku === line.sku) }));
  const fallbackTotal = cart.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const total = quote ? quote.total : fallbackTotal;

  return (
    <div className="av-container av-page">
      <header className="av-page__head"><span className="av-eyebrow">Your bag</span><h1>Bag ({cart.count})</h1></header>
      {offline && <Alert>You appear to be offline. Your bag is saved, and these are the prices from when you added each pair. Reconnect to check out.</Alert>}

      <div className="av-cart">
        <ul className="av-cartlines">
          {rows.map(({ line, q }) => <CartRow key={line.sku} line={line} q={q} loading={loading && !q} />)}
        </ul>

        <aside className="av-summary" aria-label="Order summary">
          {quote?.collection && <CollectionProgress c={quote.collection} />}
          <h2>Summary</h2>
          <dl className="av-totals">
            <div><dt>Subtotal</dt><dd className="av-price">{formatPrice(total)}</dd></div>
            <div><dt>Delivery</dt><dd className="av-small">Chosen at checkout</dd></div>
            <div className="av-totals__grand"><dt>Total</dt><dd className="av-price av-price--lg">{formatPrice(total)}</dd></div>
          </dl>
          {quote && !quote.canCheckout && !quote.collection?.minimumMessage && <Alert tone="danger">Some items need your attention before you can check out.</Alert>}
          {quote?.canCheckout && !offline
            ? <Button to="/checkout" size="lg" block>Check out</Button>
            : <Button size="lg" block disabled>Check out</Button>}
          <Link to="/shop" className="av-small">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}

/**
 * The bag seen as one collection: how many pairs so far, the minimum, the step reached and how far the next one is.
 * Every number comes from the server's quote, so it matches what checkout will charge.
 */
function CollectionProgress({ c }: { c: CollectionView }) {
  const { t } = useT();
  const target = c.minimumMessage ? c.minimumPairs : c.nextTier?.minPairs;
  const pct = target ? Math.min(100, Math.round((c.totalPairs / target) * 100)) : 100;
  return (
    <section className="av-collection" aria-label={t("bag.collection")}>
      <div className="av-collection__head">
        <span className="av-eyebrow">{t("bag.collection")}</span>
        <strong className="av-num">{t("bag.pairs", { n: c.totalPairs })}</strong>
      </div>
      {target && <div className="av-collection__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
      {c.minimumMessage && <p className="av-small">{t("bag.min", { n: c.minimumPairs })}</p>}
      {!c.minimumMessage && c.tierDiscountPct > 0 && <p className="av-small av-price__save">{t("bag.tier", { pct: Number(c.tierDiscountPct) })}</p>}
      {!c.minimumMessage && c.nextTier && <p className="av-small">{t("bag.next", { n: c.nextTier.pairsToGo, pct: Number(c.nextTier.discountPct) })}</p>}
    </section>
  );
}

function CartRow({ line, q, loading }: { line: CartLine; q?: QuoteLine; loading: boolean }) {
  const cart = useCart();
  const { t } = useT();
  const problem = q && q.problem !== "NONE";
  const unitPrice = q?.unitPrice ?? line.unitPrice;
  const max = q ? Math.max(1, Math.min(MAX_PER_LINE, q.availableQty)) : MAX_PER_LINE;
  const priceChanged = q?.unitPrice != null && !q.discountPct && Math.abs(q.unitPrice - line.unitPrice) > 0.004;

  return (
    <li className="av-cartline">
      <Link to={`/products/${line.productSlug}`} className="av-cartline__img" aria-hidden="true" tabIndex={-1}><ProductImage image={(q?.imageUrl ?? line.imageUrl) ? { url: (q?.imageUrl ?? line.imageUrl)!, alt: "" } : null} /></Link>
      <div className="av-cartline__body">
        <Link to={`/products/${line.productSlug}`} className="av-cartline__name">{line.productName}</Link>
        <span className="av-small av-muted">
          {line.colorHex && <span className="av-dot" style={{ background: line.colorHex }} />} {line.variantLabel}
        </span>
        <Price amount={unitPrice} was={q?.discountPct ? q.listPrice ?? undefined : undefined} />
        {q?.discountPct ? <span className="av-small av-price__save">{line.negotiationSessionId ? t("bag.negotiated", { pct: q.discountPct }) : t("bag.collectionPrice", { pct: q.discountPct })}</span> : null}
        {priceChanged && <span className="av-small">Price is now {formatPrice(q!.unitPrice!)} (it was {formatPrice(line.unitPrice)} when you added it).</span>}
        {q?.note && <span className={problem ? "av-error" : "av-small"}>{q.note}</span>}
        {q?.problem === "NOT_ENOUGH_STOCK" && q.availableQty > 0 && (
          <Button size="sm" variant="secondary" onClick={() => cart.setQuantity(line.sku, q.availableQty)}>Change to {q.availableQty}</Button>
        )}
        {loading && <Skeleton width={120} height={12} />}
      </div>
      <div className="av-cartline__qty">
        <QuantityStepper value={line.quantity} min={1} max={max} label={`Quantity of ${line.productName}`} onChange={(n) => cart.setQuantity(line.sku, n)} />
        <Button size="sm" variant="ghost" aria-label={`Remove ${line.productName} from the bag`} onClick={() => cart.remove(line.sku)}>Remove</Button>
      </div>
      <div className="av-cartline__total av-price">{q?.lineTotal != null ? formatPrice(q.lineTotal) : formatPrice(line.unitPrice * line.quantity)}</div>
    </li>
  );
}
