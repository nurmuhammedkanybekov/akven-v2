import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { adminHandOver } from "../api/endpoints";
import type { OrderView } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { formatPrice } from "../lib/format";
import { useT } from "../i18n/I18n";

/** At the stall: the customer says the code and the end of their phone number, and the order is handed over once. */
export function AdminHandover() {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [phoneEnd, setPhoneEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderView | null>(null);

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
      <form className="av-card-form av-narrow" onSubmit={submit}>
        <p className="av-small">{t("a.ho.lead")}</p>
        <Input label={t("a.ho.code")} inputMode="numeric" autoComplete="off" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
        <Input label={t("a.ho.phone")} inputMode="numeric" autoComplete="off" maxLength={4} value={phoneEnd} onChange={(e) => setPhoneEnd(e.target.value)} />
        <Button type="submit" size="lg" loading={busy} disabled={code.replace(/\D/g, "").length !== 6 || phoneEnd.replace(/\D/g, "").length !== 4}>{t("a.ho.submit")}</Button>
        {error && <Alert tone="danger">{error}</Alert>}
        {done && (
          <Alert tone="success">
            {t("a.ho.done", { ref: done.reference, name: done.fulfillment.contactName, n: done.items.reduce((n, i) => n + i.quantity, 0), total: formatPrice(done.total) })}
          </Alert>
        )}
      </form>
    </>
  );
}
