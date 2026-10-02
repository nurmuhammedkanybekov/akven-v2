import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";

export function RegisterPage() {
  const { session, signUp } = useAuth();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={safeNext} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setFieldErrors({});
    if (password.length < 8) { setFieldErrors({ password: "Use at least 8 characters." }); return; }
    setBusy(true);
    try { await signUp(email.trim(), password); navigate(safeNext, { replace: true }); }
    catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("There is already an account with that email. Try signing in instead.");
      else { setError((err as Error).message); if (err instanceof ApiError) setFieldErrors(err.fieldErrors); }
    } finally { setBusy(false); }
  }

  return (
    <div className="av-container av-page av-narrow">
      <header className="av-page__head"><span className="av-eyebrow">New here</span><h1>Create an account</h1>
        <p className="av-small">You need one to check out, so you can see your orders later.</p></header>
      <form className="av-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Email" type="email" autoComplete="email" value={email} error={fieldErrors.email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" autoComplete="new-password" value={password} error={fieldErrors.password} hint="At least 8 characters." onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" loading={busy} disabled={!email || !password}>Create account</Button>
        <p className="av-small">Already have an account? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link></p>
      </form>
    </div>
  );
}
