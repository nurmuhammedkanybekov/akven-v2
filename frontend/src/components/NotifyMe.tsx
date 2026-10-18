import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { cancelStockRequest, myStockRequests, requestStock } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n/I18n";
import { Button } from "./Button";
import { useToast } from "./Toast";

/**
 * Under a sold-out option: "Tell me when it's back". A signed-in customer joins the option's waiting list (and can
 * leave it); a visitor is sent to sign in first and comes back here. The owners see the list on their dashboard and
 * write to the customer when the stock arrives.
 */
export function NotifyMe({ sku }: { sku: string }) {
  const { t } = useT();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [waiting, setWaiting] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) { setWaiting([]); return; }
    let live = true;
    myStockRequests().then((l) => { if (live) setWaiting(l); }).catch(() => { if (live) setWaiting([]); });
    return () => { live = false; };
  }, [session]);

  const on = !!waiting?.includes(sku);
  async function toggle() {
    if (!session) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    setBusy(true);
    try {
      const next = on ? await cancelStockRequest(sku) : await requestStock(sku);
      setWaiting(next);
      toast(on ? t("notify.off") : t("notify.on"));
    } catch (e) { toast(e instanceof ApiError ? e.message : t("notify.failed"), "danger"); }
    finally { setBusy(false); }
  }

  return (
    <div className="av-notify" aria-live="polite">
      {on && <p className="av-small av-notify__note">{t("notify.waiting")}</p>}
      <Button variant={on ? "ghost" : "secondary"} block loading={busy} onClick={() => void toggle()}>{on ? t("notify.cancel") : t("notify.ask")}</Button>
    </div>
  );
}
