import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { setAccessToken, setUnauthorizedHandler } from "../api/client";
import { login as loginRequest, register as registerRequest } from "../api/endpoints";
import type { Role } from "../api/types";

interface Session { token: string; email: string; role: Role }
interface AuthState {
  session: Session | null;
  isStaff: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signUp: (email: string, password: string) => Promise<Session>;
  signOut: () => void;
}

const KEY = "akven-session";
const AuthContext = createContext<AuthState | null>(null);

/**
 * The login token lives in sessionStorage: it survives a page reload but disappears when the tab closes, and is
 * never sent anywhere except our own API. (localStorage would keep an admin logged in on a shared computer.)
 * Storage can be blocked (private mode); the app then simply keeps the session in memory.
 */
function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.token && parsed.email && parsed.role ? parsed : null;
  } catch { return null; }
}
function store(session: Session | null) {
  try { session ? sessionStorage.setItem(KEY, JSON.stringify(session)) : sessionStorage.removeItem(KEY); } catch { /* memory only */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restoring the session and handing its token to the API layer happen together, before any child renders.
  const [session, setSession] = useState<Session | null>(() => {
    const restored = readStored();
    setAccessToken(restored?.token ?? null);
    return restored;
  });

  const signOut = useCallback(() => { setAccessToken(null); store(null); setSession(null); }, []);
  // An expired or revoked token (401) signs the visitor out everywhere at once.
  setUnauthorizedHandler(signOut);

  const start = useCallback((r: { token: string; email: string; role: Session["role"] }) => {
    const next = { token: r.token, email: r.email, role: r.role };
    setAccessToken(next.token);
    store(next);
    setSession(next);
    return next;
  }, []);
  const signIn = useCallback(async (email: string, password: string) => start(await loginRequest(email, password)), [start]);
  // Registering signs the new customer straight in.
  const signUp = useCallback(async (email: string, password: string) => start(await registerRequest(email, password)), [start]);

  const value = useMemo<AuthState>(() => ({
    session, signIn, signUp, signOut,
    isStaff: session?.role === "STAFF" || session?.role === "ADMIN",
    isAdmin: session?.role === "ADMIN",
  }), [session, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
