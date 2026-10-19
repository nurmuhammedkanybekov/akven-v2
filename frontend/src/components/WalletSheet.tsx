import { useEffect, useState } from "react";
import type { PaymentMethod } from "../api/types";
import { formatPrice } from "../lib/format";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Switch } from "./Switch";
import { useT } from "../i18n/I18n";

const NAME: Record<PaymentMethod, string> = { APPLE_PAY: "Apple Pay", GOOGLE_PAY: "Google Pay" };

interface Props {
  method: PaymentMethod | null;
  total: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (method: PaymentMethod, declined: boolean) => void;
}

/**
 * A stand-in for the wallet's own confirmation sheet. A real Apple Pay or Google Pay sheet belongs to the device and
 * returns a one-time token; this one does the same thing in the browser, so the rest of checkout is exactly what it
 * will be with a real provider. The "decline" switch exists so a failed payment can be shown in the demo.
 */
export function WalletSheet({ method, total, busy, onCancel, onConfirm }: Props) {
  const { t } = useT();
  const [declined, setDeclined] = useState(false);
  // Every time the sheet opens the demo switch starts off, so a normal payment is the default.
  useEffect(() => { if (method) setDeclined(false); }, [method]);
  return (
    <Dialog open={method !== null} title={method ? t("ws.title", { name: NAME[method] }) : ""} onClose={onCancel}
            actions={<><Button variant="ghost" onClick={onCancel} disabled={busy}>{t("ws.cancel")}</Button>
              <Button loading={busy} onClick={() => method && onConfirm(method, declined)}>{t("ws.pay", { total: formatPrice(total) })}</Button></>}>
      <p>AKVEN · <strong>{formatPrice(total)}</strong></p>
      <Alert>{t("ws.demo")}</Alert>
      <Switch checked={declined} onChange={setDeclined} label={t("ws.decline")} />
    </Dialog>
  );
}
