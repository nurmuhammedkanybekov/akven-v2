import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "danger" | "ai" | "accent";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`av-badge${tone === "neutral" ? "" : ` av-badge--${tone}`}`}>{children}</span>;
}

/** Stock wording used everywhere: never a bare number in the customer's face unless it is about to run out. */
export function StockBadge({ available }: { available: number | boolean }) {
  const qty = typeof available === "boolean" ? (available ? Infinity : 0) : available;
  if (qty <= 0) return <Badge tone="danger">Sold out</Badge>;
  if (qty <= 5) return <Badge tone="accent">Only {qty} left</Badge>;
  return <Badge tone="success">In stock</Badge>;
}
