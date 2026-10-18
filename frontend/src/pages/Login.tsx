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

export function LoginPage() {
  const { session, isStaff, signIn, signOut } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `next` must be a path inside this site, never a full URL (no open redirect).
  const safeNextPath = safeNext(next);
  if (session) return <Navigate to={safeNextPath ?? (isStaff ? "/admin" : "/")} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const s = await signIn(email.trim(), password);
      navigate(safeNextPath ?? (s.role === "CUSTOMER" ? "/" : "/admin"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("auth.wrong") : (err as Error).message);
      signOut();
    } finally { setBusy(false); }
  }

  return (
    <AuthShell eyebrow={t("auth.welcome")} title={t("auth.signin")}>
      <form className="av-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label={t("auth.email")} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t("auth.password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" block loading={busy} disabled={!email || !password}>{t("auth.signin")}</Button>
        <p className="av-auth__switch">{t("auth.new")} <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("auth.create")}</Link></p>
      </form>
    </AuthShell>
  );
}
