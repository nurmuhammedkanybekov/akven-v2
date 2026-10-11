import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n/I18n";

/** Prices, contacts and sizes belong to the owners. The server enforces it; this just says so instead of showing errors. */
export function OwnersOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const { t } = useT();
  if (!isAdmin) {
    return (
      <div className="av-empty">
        <h2>{t("a.owners.title")}</h2>
        <p className="av-lead">{t("a.owners.lead")}</p>
      </div>
    );
  }
  return <>{children}</>;
}
