import type { OrderStatus } from "../api/types";
import type { MessageKey } from "../i18n/en";
import { useT } from "../i18n/I18n";
import { Badge, type BadgeTone } from "./Badge";

const SHOWN: Record<OrderStatus, { label: MessageKey; tone: BadgeTone }> = {
  PENDING: { label: "ost.PENDING", tone: "accent" },
  PAID: { label: "ost.PAID", tone: "success" },
  FULFILLED: { label: "ost.FULFILLED", tone: "success" },
  CANCELLED: { label: "ost.CANCELLED", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useT();
  const s = SHOWN[status];
  return <Badge tone={s.tone}>{t(s.label)}</Badge>;
}
