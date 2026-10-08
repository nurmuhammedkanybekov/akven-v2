import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

/** Prices, contacts and sizes belong to the owners. The server enforces it; this just says so instead of showing errors. */
export function OwnersOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="av-empty">
        <h2>Only the owners can change this</h2>
        <p className="av-lead">Ask an owner to sign in, or to change it for you.</p>
      </div>
    );
  }
  return <>{children}</>;
}
