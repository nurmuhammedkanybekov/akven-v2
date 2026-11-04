import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { findMyOrder } from "../api/endpoints";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { useT } from "../i18n/I18n";

/**
 * "I ordered without an account and lost the link." The shop emails the link to the address the order was placed
 * with, and says the same thing whether or not anything matched: the form cannot be used to learn who ordered what.
 */
export function FindOrderForm({ reference: start = "" }: { reference?: string }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState(start);
  const [errors, setErrors] = useState<{ email?: string; reference?: string }>({});
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    const ref = reference.trim().toUpperCase();
    const errs: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) errs.email = t("co.errEmail");
    if (!/^AV-[0-9A-F]{8}$/.test(ref)) errs.reference = t("find.errRef");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError(null);
    try { await findMyOrder(email.trim(), ref); setSent(ref); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("co.errGeneric")); }
    finally { setBusy(false); }
  }

  if (sent) return <Alert tone="success">{t("find.sent", { ref: sent })}</Alert>;
  return (
    <form className="av-card-form av-find" noValidate onSubmit={send} aria-label={t("find.title")}>
      <Input label={t("co.email")} type="email" autoComplete="email" inputMode="email" value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
      <Input label={t("find.ref")} hint={t("find.refHint")} autoCapitalize="characters" spellCheck={false} value={reference} error={errors.reference}
             onChange={(e) => setReference(e.target.value)} />
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-row"><Button type="submit" loading={busy}>{t("find.send")}</Button></div>
    </form>
  );
}

export function FindOrderPage() {
  const { t } = useT();
  return (
    <div className="av-container av-page av-narrow">
      <header className="av-page__head"><span className="av-eyebrow">{t("find.eyebrow")}</span><h1>{t("find.title")}</h1></header>
      <p className="av-lead">{t("find.lead")}</p>
      <FindOrderForm />
    </div>
  );
}
