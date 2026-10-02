import type { OrderStatus } from "../api/types";
import { Badge, type BadgeTone } from "./Badge";

const SHOWN: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Waiting for payment", tone: "accent" },
  PAID: { label: "Paid", tone: "success" },
  FULFILLED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = SHOWN[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
