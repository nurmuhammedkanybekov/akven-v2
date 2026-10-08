import type { ReactNode } from "react";
import type { StockStatus } from "../api/types";
import { useT } from "../i18n/I18n";

export type BadgeTone = "neutral" | "success" | "danger" | "ai" | "accent" | "warning";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`av-badge${tone === "neutral" ? "" : ` av-badge--${tone}`}`}>{children}</span>;
}

interface StockBadgeProps {
  /** Units left. Without a status from the server, five or fewer counts as "only a few left". */
  available: number | boolean;
  /** The server's verdict (it knows the owners' threshold and what is on the way); preferred when present. */
  status?: StockStatus;
  restockInDays?: number | null;
}

/** Stock wording used everywhere: never a bare number in the customer's face unless it is about to run out. */
export function StockBadge({ available, status, restockInDays }: StockBadgeProps) {
  const { t } = useT();
  const qty = typeof available === "boolean" ? (available ? Infinity : 0) : available;
  const s: StockStatus = status ?? (qty <= 0 ? "SOLD_OUT" : qty <= 5 ? "FEW_LEFT" : "IN_STOCK");
  if (s === "SOLD_OUT") return <Badge tone="danger">{t("stock.out")}</Badge>;
  if (s === "COMING_SOON") {
    return <Badge tone="accent">{restockInDays == null ? t("stock.soonNote") : restockInDays <= 0 ? t("stock.soonToday") : t("stock.soon", { n: restockInDays })}</Badge>;
  }
  if (s === "FEW_LEFT") return <Badge tone="warning">{t("stock.few", { n: qty })}</Badge>;
  return <Badge tone="success">{t("stock.in")}</Badge>;
}
