import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getMatching } from "../api/endpoints";
import type { ProductSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useQuote } from "../cart/useQuote";
import { useT } from "../i18n/I18n";
import { useMoney } from "../shop/useMoney";
import { Button } from "./Button";
import { CheckIcon, CloseIcon } from "./icons";
import { PairMeter } from "./PairMeter";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

/**
 * The bag, slid in from the side when a sock is added: what went in, how far the bag is from the next collection
 * price (from the server's own quote), the same design for someone else in the family, and the way to the bag or
 * checkout. Not on the bag and checkout pages themselves. Escape, the close button or a click outside closes it.
 */
export function BagDrawer() {
  const { t } = useT();
  const { money } = useMoney();
  const cart = useCart();
  const { session } = useAuth();
  const { pathname } = useLocation();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState<ProductSummary[]>([]);
  const seen = useRef<number | null>(null);
  const line = cart.lastAdded ? cart.lines.find((l) => l.sku === cart.lastAdded!.sku) : undefined;
  const { quote } = useQuote(open ? cart.lines : [], session?.email ?? null);

  useEffect(() => {
    const at = cart.lastAdded?.at ?? null;
    if (at === null || at === seen.current) return;
    seen.current = at;
    if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/orders")) return;
    setOpen(true);
  }, [cart.lastAdded, pathname]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close?.();
  }, [open]);
  useEffect(() => {
    if (!open || !line) { setMatch([]); return; }
    const ctrl = new AbortController();
    getMatching(line.productSlug, ctrl.signal).then((m) => setMatch(m.filter((p) => p.inStock).slice(0, 2))).catch(() => setMatch([]));
    return () => ctrl.abort();
  }, [open, line?.productSlug]);

  const c = quote?.collection;
  const target = c ? (c.minimumMessage ? c.minimumPairs : c.nextTier?.minPairs) : undefined;

  return (
    <dialog ref={ref} className="av-bagdrawer" aria-labelledby="bag-drawer-title" onClose={() => setOpen(false)} onCancel={() => setOpen(false)}
            onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
      {open && (
        <div className="av-bagdrawer__panel">
          <header className="av-bagdrawer__head">
            <h2 id="bag-drawer-title"><span className="av-bagdrawer__tick" aria-hidden="true"><CheckIcon /></span>{t("pdp.added")}</h2>
            <button type="button" className="av-icon-btn" aria-label={t("qv.close")} onClick={() => setOpen(false)}><CloseIcon /></button>
          </header>
          {line && (
            <div className="av-bagdrawer__line">
              <span className="av-bagdrawer__img"><ProductImage image={line.imageUrl ? { url: line.imageUrl, alt: "" } : null} /></span>
              <span className="av-stack">
                <strong>{line.productName}</strong>
                <span className="av-small av-muted">{line.variantLabel} · ×{line.quantity}</span>
                <span className="av-price">{money(line.unitPrice * line.quantity)}</span>
              </span>
            </div>
          )}
          {c && (
            <section className="av-bagdrawer__collection" aria-label={t("bag.collection")}>
              <div className="av-row av-between"><span className="av-eyebrow">{t("bag.collection")}</span><strong className="av-num">{t("bag.pairs", { n: c.totalPairs })}</strong></div>
              {target ? <PairMeter total={c.totalPairs} target={target} /> : null}
              <p className="av-small">
                {c.minimumMessage ? t("bag.min", { n: c.minimumPairs })
                  : c.nextTier ? t("bag.next", { n: c.nextTier.pairsToGo, pct: Number(c.nextTier.discountPct) })
                  : c.tierDiscountPct > 0 ? t("bag.tier", { pct: Number(c.tierDiscountPct) }) : null}
              </p>
            </section>
          )}
          {match.length > 0 && (
            <section className="av-bagdrawer__match" aria-labelledby="bag-match">
              <h3 id="bag-match">{t("bag.matchTitle")}</h3>
              <ul>
                {match.map((p) => (
                  <li key={p.slug}>
                    <Link to={`/products/${p.slug}`}>
                      <span className="av-bagdrawer__img"><ProductImage image={p.image} /></span>
                      <span><strong>{p.name}</strong><br /><span className="av-small av-muted">{t(`nav.${p.category.toLowerCase()}` as "nav.men")}</span></span>
                      <Price amount={p.minPrice} from={p.variantCount > 1} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {cart.lines.length > 1 && (
            <section className="av-bagdrawer__all" aria-label={t("bag.inBag")}>
              <div className="av-row av-between"><span className="av-eyebrow">{t("bag.inBag")}</span><span className="av-small">{t("bag.lines", { n: cart.lines.length })}</span></div>
              <ul>
                {cart.lines.filter((l) => l.sku !== line?.sku).slice(0, 4).map((l, i) => (
                  <li key={l.sku} style={{ "--i": i } as React.CSSProperties}>
                    <span className="av-bagdrawer__mini"><ProductImage image={l.imageUrl ? { url: l.imageUrl, alt: "" } : null} /></span>
                    <span className="av-small">{l.productName} ×{l.quantity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="av-bagdrawer__actions">
            {quote && <p className="av-bagdrawer__total"><span>{t("cart.subtotal")}</span><strong className="av-price">{money(quote.total)}</strong></p>}
            {quote?.canCheckout && <Button to="/checkout" variant="accent" block>{t("cart.checkout")}</Button>}
            <Button to="/cart" block variant={quote?.canCheckout ? "secondary" : "primary"}>{t("bag.view", { n: cart.count })}</Button>
            <Button variant="ghost" block onClick={() => setOpen(false)}>{t("cart.continue")}</Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
