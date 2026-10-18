import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { AuthShell } from "../components/AuthShell";
import { Input } from "../components/Field";
import { useT } from "../i18n/I18n";
import { safeNext } from "../lib/safeNext";

export function RegisterPage() {
  const { t } = useT();
  const { session, signUp } = useAuth();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  const safeNextPath = safeNext(next) ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={safeNextPath} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setFieldErrors({});
    if (password.length < 8) { setFieldErrors({ password: t("auth.short") }); return; }
    setBusy(true);
    try { await signUp(email.trim(), password); navigate(safeNextPath, { replace: true }); }
    catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t("auth.exists"));
      else { setError((err as Error).message); if (err instanceof ApiError) setFieldErrors(err.fieldErrors); }
    } finally { setBusy(false); }
  }

  return (
    <AuthShell eyebrow={t("auth.newHere")} title={t("auth.create")} lead={t("auth.why")}>
      <form className="av-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label={t("auth.email")} type="email" autoComplete="email" value={email} error={fieldErrors.email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t("auth.password")} type="password" autoComplete="new-password" value={password} error={fieldErrors.password} hint={t("auth.hint")} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" block loading={busy} disabled={!email || !password}>{t("auth.createBtn")}</Button>
        <p className="av-auth__switch">{t("auth.have")} <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("auth.signin")}</Link></p>
      </form>
    </AuthShell>
  );
}
