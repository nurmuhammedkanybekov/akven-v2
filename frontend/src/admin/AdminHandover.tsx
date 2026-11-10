import { useCallback, useState, type FormEvent } from "react";
import { useMoney } from "../shop/useMoney";
import { ApiError } from "../api/client";
import { adminHandOver, adminListOrders } from "../api/endpoints";
import type { OrderView } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Alert";
import { ProductImage } from "../components/ProductImage";
import { Link } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";

import { useT } from "../i18n/I18n";
import { QrScanner } from "./QrScanner";

/**
 * At the stall: the customer says the code (or shows its QR code to be scanned) and the end of their phone number, and
 * the order is handed over once.
 */
export function AdminHandover() {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [phoneEnd, setPhoneEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderView | null>(null);

  const scanned = useCallback((c: string) => setCode(`${c.slice(0, 3)} ${c.slice(3)}`), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setDone(null);
    try {
      setDone(await adminHandOver(code.replace(/\D/g, ""), phoneEnd.replace(/\D/g, "")));
      setCode(""); setPhoneEnd("");
    } catch (err) { setError(err instanceof ApiError ? err.message : t("a.ho.failed")); } finally { setBusy(false); }
  }

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.ho.eyebrow")}</span><h1>{t("a.nav.handover")}</h1></div></header>
      <div className="av-handover">
        <form className="av-card-form av-handover__form" onSubmit={submit}>
          <p className="av-small">{t("a.ho.lead")}</p>
          <QrScanner onCode={scanned} />
          <label className="av-field">
            <span className="av-label">{t("a.ho.code")}</span>
            <input className="av-input av-handover__code" inputMode="numeric" autoComplete="off" maxLength={7} placeholder="000 000" value={code}
                   onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d); }} />
          </label>
          <label className="av-field">
            <span className="av-label">{t("a.ho.phone")}</span>
            <input className="av-input av-handover__code av-handover__code--short" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="0000" value={phoneEnd}
                   onChange={(e) => setPhoneEnd(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </label>
          <Button type="submit" size="lg" loading={busy} disabled={code.replace(/\D/g, "").length !== 6 || phoneEnd.replace(/\D/g, "").length !== 4}>{t("a.ho.submit")}</Button>
          {error && <Alert tone="danger">{error}</Alert>}
        </form>
        <div className="av-handover__side">
          {done && <HandedOver order={done} />}
          <Waiting key={done?.id ?? "none"} />
        </div>
      </div>
    </>
  );
}

/** What to give the customer, right after the check: name, every sock with its colour and size, and the gift box. */
function HandedOver({ order: o }: { order: OrderView }) {
  const { t } = useT();
  const { money } = useMoney();
  return (
    <section className="av-card-form av-handover__done" aria-live="polite">
      <p className="av-handover__tick" aria-hidden="true">✓</p>
      <h2 className="av-formtitle">{t("a.ho.giveTo", { name: o.fulfillment.contactName })}</h2>
      {o.payOnHandover && <p className="av-handover__pay"><strong>{t("a.ho.paidNow", { total: money(o.total) })}</strong></p>}
      <p className="av-small">{t("a.ho.done", { ref: o.reference, name: o.fulfillment.contactName, n: o.items.reduce((n, i) => n + i.quantity, 0), total: money(o.total) })}</p>
      <ul className="av-handover__items">
        {o.items.map((i) => (
          <li key={i.sku}>
            <span className="av-orderthumbs__img"><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>
            <span><strong>{i.quantity} ×</strong> {i.productName}<br /><span className="av-small av-muted">{i.variantLabel} · {i.sku}</span></span>
          </li>
        ))}
      </ul>
      {o.gift && <p className="av-small">🎁 {t("a.ho.gift", { box: o.gift.box, ribbon: o.gift.ribbon })}</p>}
    </section>
  );
}

/** Paid pickup orders not collected yet, oldest first: the team can pack the bags before the customers come. */
function Waiting() {
  const { t } = useT();
  const { money } = useMoney();
  // Paid orders and reservations (paid at the stall) both wait here, oldest first.
  const list = useAsync(async () => {
    const [paid, reserved] = await Promise.all([adminListOrders({ status: "PAID", way: "PICKUP", page: 0, pageSize: 50 }),
      adminListOrders({ status: "RESERVED", way: "PICKUP", page: 0, pageSize: 50 })]);
    return { items: [...paid.items, ...reserved.items] };
  }, []);
  const waiting = [...(list.data?.items ?? [])].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const since = (iso: string | null) => {
    if (!iso) return "";
    const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
    return h < 1 ? t("a.ho.justNow") : h < 48 ? t("a.ho.hours", { n: h }) : t("a.ho.days", { n: Math.round(h / 24) });
  };
  return (
    <section className="av-card-form" aria-labelledby="waiting-h">
      <h2 id="waiting-h" className="av-formtitle">{t("a.ho.waiting")} {list.data && <span className="av-small av-muted">· {waiting.length}</span>}</h2>
      <p className="av-small av-muted">{t("a.ho.waitingLead")}</p>
      {list.loading && !list.data && <Skeleton height={120} />}
      {list.data && waiting.length === 0 && <p className="av-small">{t("a.ho.noneWaiting")}</p>}
      <ul className="av-handover__list">
        {waiting.map((o) => (
          <li key={o.id}>
            <div className="av-orderthumbs">
              {o.items.slice(0, 4).map((i) => <span key={i.sku} className="av-orderthumbs__img"><ProductImage image={i.imageUrl ? { url: i.imageUrl, alt: "" } : null} /></span>)}
            </div>
            <span className="av-handover__who"><strong>{o.fulfillment.contactName}</strong><br />
              <Link className="av-small" to={`/admin/orders/${o.id}`}>{o.reference}</Link>
              <span className="av-small av-muted"> · {t("bag.pairs", { n: o.items.reduce((n, i) => n + i.quantity, 0) })}{o.gift ? " · 🎁" : ""}</span>
              {o.status === "RESERVED" && <><br /><span className="av-small"><strong>{t("a.ho.toPay", { total: money(o.total) })}</strong></span></>}</span>
            <span className="av-small av-muted av-handover__since">{since(o.paidAt ?? o.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
