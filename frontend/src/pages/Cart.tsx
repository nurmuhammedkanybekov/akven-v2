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
import { withMessage } from "../components/Contacts";
import { useShopInfo } from "../shop/useShopInfo";
import { useMoney } from "../shop/useMoney";
import type { CollectionView } from "../api/types";

/** The bag: what is in it, at today's prices, with honest notes about anything that changed. */
export function CartPage() {
  const { money } = useMoney();
  const cart = useCart();
  const { session } = useAuth();
  const { quote, loading, offline } = useQuote(cart.lines, session?.email ?? null);
  const { t } = useT();
  const info = useShopInfo();
  const messengers = (info?.contacts ?? []).filter((c) => c.kind === "WHATSAPP" || c.kind === "TELEGRAM");

  if (cart.lines.length === 0) {
    return (
      <div className="av-container av-page av-empty av-empty--bag">
        <h1>{t("cart.empty")}</h1>
        <p className="av-lead">{t("cart.emptyS")}</p>
        <div className="av-row"><Button to="/shop">{t("cart.browse")}</Button><Button to="/saved" variant="secondary">{t("nav.savedTitle")}</Button></div>
      </div>
    );
  }

  const rows = cart.lines.map((line) => ({ line, q: quote?.lines.find((l) => l.sku === line.sku) }));
  const fallbackTotal = cart.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const total = quote ? quote.total : fallbackTotal;
  // The bag written out, for customers who would rather order by message: nothing is sent until they press send.
  const message = [t("cart.msgHello"), ...cart.lines.map((l) => `• ${l.productName} (${l.variantLabel}) × ${l.quantity}`), t("cart.msgTotal", { total: money(total) })].join("\n");

  return (
    <div className="av-container av-page">
      <header className="av-page__head"><span className="av-eyebrow">{t("cart.eyebrow")}</span><h1>{t("cart.title", { n: cart.count })}</h1></header>
      {offline && <Alert>{t("cart.offline")}</Alert>}

      <div className="av-cart">
        <ul className="av-cartlines">
          {rows.map(({ line, q }) => <CartRow key={line.sku} line={line} q={q} loading={loading && !q} />)}
        </ul>

        <aside className="av-summary" aria-label={t("cart.summaryLabel")}>
          {quote?.collection && <CollectionProgress c={quote.collection} />}
          <h2>{t("cart.summary")}</h2>
          <dl className="av-totals">
            <div><dt>{t("cart.subtotal")}</dt><dd className="av-price">{money(total)}</dd></div>
            <div><dt>{t("cart.delivery")}</dt><dd className="av-small">{t("cart.deliveryS")}</dd></div>
            <div className="av-totals__grand"><dt>{t("cart.total")}</dt><dd className="av-price av-price--lg">{money(total)}</dd></div>
          </dl>
          {quote && !quote.canCheckout && !quote.collection?.minimumMessage && <Alert tone="danger">{t("cart.attention")}</Alert>}
          {quote?.canCheckout && !offline
            ? <Button to="/checkout" size="lg" block>{t("cart.checkout")}</Button>
            : <Button size="lg" block disabled>{t("cart.checkout")}</Button>}
          {messengers.length > 0 && (
            <div className="av-summary__msg">
              <span className="av-small">{t("cart.orMessage")}</span>
              <div className="av-row">
                {messengers.map((c) => (
                  <Button key={c.id} href={withMessage(c, message)} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
                    {c.kind === "WHATSAPP" ? "WhatsApp" : "Telegram"}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Link to="/shop" className="av-small">{t("cart.continue")}</Link>
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
  const { money } = useMoney();
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
        {priceChanged && <span className="av-small">Price is now {money(q!.unitPrice!)} (it was {money(line.unitPrice)} when you added it).</span>}
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
      <div className="av-cartline__total av-price">{q?.lineTotal != null ? money(q.lineTotal) : money(line.unitPrice * line.quantity)}</div>
    </li>
  );
}
