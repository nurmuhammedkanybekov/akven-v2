import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n/I18n";

/** Accounts, the assistant and the audit log belong to the super admin. The server enforces it; this says so. */
export function SuperAdminOnly({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = useAuth();
  const { t } = useT();
  if (!isSuperAdmin) {
    return (
      <div className="av-empty">
        <h2>{t("a.super.title")}</h2>
        <p className="av-lead">{t("a.super.lead")}</p>
      </div>
    );
  }
  return <>{children}</>;
}
