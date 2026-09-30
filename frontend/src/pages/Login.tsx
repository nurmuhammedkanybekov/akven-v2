import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";

export function LoginPage() {
  const { session, isStaff, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `next` must be a path inside this site, never a full URL (no open redirect).
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  if (session) return <Navigate to={safeNext ?? (isStaff ? "/admin" : "/")} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const s = await signIn(email.trim(), password);
      navigate(safeNext ?? (s.role === "CUSTOMER" ? "/" : "/admin"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "That email and password do not match." : (err as Error).message);
      signOut();
    } finally { setBusy(false); }
  }

  return (
    <div className="av-container av-page av-narrow">
      <header className="av-page__head"><span className="av-eyebrow">Welcome back</span><h1>Sign in</h1></header>
      <form className="av-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" loading={busy} disabled={!email || !password}>Sign in</Button>
        <p className="av-small">New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
      </form>
    </div>
  );
}
