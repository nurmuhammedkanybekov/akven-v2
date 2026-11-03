import { useEffect, useState } from "react";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { Button } from "./Button";

/**
 * What a page says when its socks could not be fetched: why, if the phone is offline, and a way to try again without
 * reloading the whole page. Tries again by itself once the connection comes back.
 */
export function LoadFailed({ message, onRetry }: { message: MessageKey; onRetry: () => void }) {
  const { t } = useT();
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const on = () => { setOffline(false); onRetry(); };
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [onRetry]);
  return (
    <div className="av-loadfailed" role="alert">
      <p>{offline ? t("err.noNet") : t(message)}</p>
      <Button variant="secondary" onClick={onRetry}>{t("err.retry")}</Button>
    </div>
  );
}
