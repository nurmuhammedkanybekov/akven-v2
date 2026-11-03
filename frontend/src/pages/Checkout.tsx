import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { checkout, getDeliveryZones, getMyDetails, saveMyDetails } from "../api/endpoints";
import type { Country, FulfillmentMethod, PaymentMethod } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useQuote } from "../cart/useQuote";
import { Alert, Skeleton } from "../components/Alert";
import { useShopInfo } from "../shop/useShopInfo";
import { Button } from "../components/Button";
import { Input, Textarea } from "../components/Field";
import { WalletSheet } from "../components/WalletSheet";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { useMoney } from "../shop/useMoney";
import { newId } from "../lib/ids";
import { deliveryFee, toFreeDelivery } from "../lib/delivery";
import { useAsync } from "../hooks/useAsync";
import { newWalletToken } from "../lib/wallet";
import { GiftSummary } from "../components/GiftSummary";
import { giftForCheckout, setGift, useGift } from "../shop/useGift";

/**
 * One page: who to contact, how you get it, what it costs (from the server, never from the browser), and two wallet
 * buttons. Each attempt carries a fresh Idempotency-Key, so a double click or a retry can never pay twice.
 */
export function CheckoutPage() {
  const { money, shown, usd } = useMoney();
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { quote, loading, offline } = useQuote(cart.lines, session?.email ?? null);
  const gift = useGift();
  // NONE: this installation takes no payments (started outside demo mode); SIMULATED: the demo wallet.
  const payments = useShopInfo()?.payments;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod>("PICKUP");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState<Country>("KG");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const zones = useAsync((signal) => getDeliveryZones(signal), []);
  // The details the customer asked us to remember: filled in once, never over what they have typed.
  const [remember, setRemember] = useState(false);
  const [hadDetails, setHadDetails] = useState(false);
  useEffect(() => {
    if (!session) return;
    let live = true;
    getMyDetails().then((d) => {
      if (!live || !(d.contactName || d.contactPhone || d.address)) return;
      setHadDetails(true); setRemember(true);
      setName((v) => v || d.contactName || "");
      setPhone((v) => v || d.contactPhone || "");
      setAddress((v) => v || d.address || "");
      if (d.address || d.zoneId) setMethod((m) => (m === "PICKUP" && d.zoneId ? "DELIVERY" : m));
      if (d.country) setCountry(d.country);
      if (d.zoneId) setZoneId(d.zoneId);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [session]);
  const { t } = useT();
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
  const itemsTotal = quote?.total ?? cart.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  // Anything but a list (an old server, a proxy page) counts as not known yet, never as a crash.
  const allZones = Array.isArray(zones.data) ? zones.data : [];
  const countries = (["KG", "KZ", "UZ", "RU"] as const).filter((c) => allZones.some((z) => z.country === c));
  const inCountry = allZones.filter((z) => z.country === country);
  const zone = method === "DELIVERY" ? inCountry.find((z) => z.id === zoneId) ?? inCountry[0] ?? null : null;
  const fee = zone ? deliveryFee(zone, itemsTotal) : 0;
  const toFree = zone ? toFreeDelivery(zone, itemsTotal) : null;
  const total = Math.round((itemsTotal + fee) * 100) / 100;
  const noDelivery = method === "DELIVERY" && Array.isArray(zones.data) && allZones.length === 0;
  const days = (z: { daysMin: number | null; daysMax: number | null }) => z.daysMin == null ? t("co.daysAgreed")
    : z.daysMax == null || z.daysMax === z.daysMin ? t("co.day", { n: z.daysMin }) : t("co.days", { min: z.daysMin, max: z.daysMax });

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("co.errName");
    if (!/^[0-9+()\-\s]{6,40}$/.test(phone.trim())) errs.phone = t("co.errPhone");
    if (method === "DELIVERY" && !address.trim()) errs.address = t("co.errAddress");
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
        fulfillment: { method, contactName: name.trim(), contactPhone: phone.trim(), address: method === "DELIVERY" ? address.trim() : null, note: note.trim() || null,
          country: method === "DELIVERY" ? zone?.country ?? country : null, zoneId: method === "DELIVERY" ? zone?.id ?? null : null },
        payment: { method: payment, token: newWalletToken(payment, declined) },
        gift: giftForCheckout(gift),
      }, attemptKey.current);
      setPlaced(true);
      // Keep (or update) the details for next time only when asked; a failure here never spoils the order.
      if (remember) {
        void saveMyDetails({ contactName: name.trim(), contactPhone: phone.trim(), address: method === "DELIVERY" ? address.trim() : null,
          country: method === "DELIVERY" ? zone?.country ?? country : null, zoneId: method === "DELIVERY" ? zone?.id ?? null : null }).catch(() => undefined);
      }
      cart.clear();
      setGift(null);
      navigate(`/orders/${order.id}`, { replace: true, state: { justPaid: true } });
    } catch (e) {
      setSheet(null);
      const api = e instanceof ApiError ? e : null;
      // Only a lost connection may reuse the key: the request might have gone through. Every answer from the server is final for its key.
      if (!api || api.status !== 0) attemptKey.current = newId();
      setError(api ? api.message : t("co.errGeneric"));
      if (api?.fieldErrors) setFieldErrors(Object.fromEntries(Object.entries(api.fieldErrors).map(([k, v]) => [k.split(".").pop()!, v])));
    } finally { setBusy(false); }
  }

  return (
    <div className="av-container av-page">
      <header className="av-page__head"><span className="av-eyebrow">{t("co.eyebrow")}</span><h1>{t("co.title")}</h1></header>
      {offline && <Alert tone="danger">{t("co.offline")}</Alert>}
      {error && <Alert tone="danger">{error} {error.match(/left|sold out|no longer/i) && <Link to="/cart">{t("co.review")}</Link>}</Alert>}
      {quote && !quote.canCheckout && <Alert tone="danger">{t("co.changed")} <Link to="/cart">{t("co.review")}</Link></Alert>}

      <div className="av-cart">
        <form className="av-card-form" noValidate onSubmit={(e) => choose("APPLE_PAY", e)} aria-label={t("co.formLabel")}>
          <h2 className="av-formtitle">{t("co.contact")}</h2>
          <div className="av-formgrid">
            <Input label={t("co.name")} autoComplete="name" value={name} error={fieldErrors.name ?? fieldErrors.contactName} onChange={(e) => setName(e.target.value)} />
            <Input label={t("co.phone")} type="tel" autoComplete="tel" value={phone} error={fieldErrors.phone ?? fieldErrors.contactPhone} hint={t("co.phoneHint")} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <fieldset className="av-option">
            <legend className="av-label">{t("co.how")}</legend>
            <div className="av-row" role="radiogroup" aria-label={t("co.how")}>
              <label className="av-radiocard"><input type="radio" name="fulfilment" checked={method === "PICKUP"} onChange={() => setMethod("PICKUP")} /><span><strong>{t("co.pickup")}</strong><br /><span className="av-small">{t("co.pickupS")}</span></span></label>
              <label className="av-radiocard"><input type="radio" name="fulfilment" checked={method === "DELIVERY"} onChange={() => setMethod("DELIVERY")} /><span><strong>{t("co.delivery")}</strong><br /><span className="av-small">{t("co.deliveryS")}</span></span></label>
            </div>
          </fieldset>
          {noDelivery && <Alert tone="danger">{t("co.noDelivery")}</Alert>}
          {method === "DELIVERY" && countries.length > 0 && (
            <label className="av-field">
              <span className="av-label">{t("order.country")}</span>
              <select className="av-select" value={country} onChange={(e) => { setCountry(e.target.value as Country); setZoneId(null); }}>
                {countries.map((c) => <option key={c} value={c}>{t(`country.${c}` as MessageKey)}</option>)}
              </select>
            </label>
          )}
          {method === "DELIVERY" && inCountry.length > 0 && (
            <fieldset className="av-option av-zones">
              <legend className="av-label">{t("co.area")}</legend>
              {inCountry.map((z) => {
                const f = deliveryFee(z, itemsTotal);
                return (
                  <label key={z.id} className="av-radiocard av-zone">
                    <input type="radio" name="zone" checked={zone?.id === z.id} onChange={() => setZoneId(z.id)} />
                    <span className="av-zone__name"><strong>{z.name}</strong><span className="av-small">{days(z)}</span></span>
                    <span className="av-zone__fee">
                      <strong>{f === 0 ? t("co.free") : money(f)}</strong>
                      {z.freeFrom != null && f > 0 && <span className="av-small">{t("co.freeFrom", { amount: money(z.freeFrom) })}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {method === "DELIVERY" && <Textarea label={t("co.address")} rows={2} value={address} error={fieldErrors.address} onChange={(e) => setAddress(e.target.value)} />}
          <Textarea label={t("co.note")} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="av-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t(hadDetails ? "co.rememberAgain" : "co.remember")}</label>

          <h2 className="av-formtitle">{t("co.payment")}</h2>
          <p className="av-small">{t("co.paymentS")}</p>
          {/* On a phone the order sits under the form: the amount is said here, before anyone presses "Pay". */}
          <p className="av-topay" aria-live="polite"><span>{t("co.toPay")}</span> <strong className="av-price">{money(total)}</strong> <a href="#order-summary">{t("co.seeOrder")}</a></p>
          {payments === "NONE" ? (
            <Alert>{t("co.noPayments")} <Link to="/cart">{t("co.noPaymentsBag")}</Link></Alert>
          ) : (
          <div className="av-row">
            <Button size="lg" type="button" onClick={() => choose("APPLE_PAY")} disabled={!quote?.canCheckout || offline || busy || noDelivery}>{t("co.apple")}</Button>
            <Button size="lg" type="button" variant="secondary" onClick={() => choose("GOOGLE_PAY")} disabled={!quote?.canCheckout || offline || busy || noDelivery}>{t("co.google")}</Button>
          </div>
          )}
        </form>

        <aside className="av-summary" id="order-summary" aria-label={t("co.summary")}>
          <h2>{t("co.summary")}</h2>
          {loading && !quote ? <Skeleton height={80} /> : (
            <ul className="av-minilines">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.sku}>
                  <span>{l.quantity} × {l.productName}<br /><span className="av-small av-muted">{l.variantLabel}{l.discountPct ? ` · ${t("co.off", { pct: l.discountPct })}` : ""}</span></span>
                  <span className="av-price">{l.lineTotal != null ? money(l.lineTotal) : "–"}</span>
                </li>
              ))}
            </ul>
          )}
          {gift && <GiftSummary gift={gift} edit />}
          <dl className="av-totals">
            {zone && <div><dt>{t("co.socks")}</dt><dd className="av-price">{money(itemsTotal)}</dd></div>}
            {zone && <div><dt>{t("co.deliveryLine")} · {zone.name}</dt><dd className="av-price">{fee === 0 ? t("co.free") : money(fee)}</dd></div>}
            <div className="av-totals__grand"><dt>{t("cart.total")}</dt><dd className="av-price av-price--lg">{money(total)}</dd></div>
          </dl>
          {toFree != null && <p className="av-small av-zones__hint">{t("co.toFree", { amount: money(toFree) })}</p>}
          {shown === "KGS" && <p className="av-small av-muted">{t("price.chargedUsd", { usd: usd(total) })}</p>}
        </aside>
      </div>

      <WalletSheet method={sheet} total={total} busy={busy} onCancel={() => setSheet(null)} onConfirm={pay} />
    </div>
  );
}
