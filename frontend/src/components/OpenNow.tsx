import { useEffect, useState } from "react";
import type { PickupPoint } from "../api/types";
import { useT } from "../i18n/I18n";
import { openStatus, weekdayNames } from "../lib/hours";

/**
 * "Open now · until 16:00" or "Closed · opens tomorrow at 8:00", in Bishkek time, updated every minute. Says nothing
 * until the owners have entered the hours.
 */
export function OpenNow({ point, className }: { point: Pick<PickupPoint, "opensAt" | "closesAt" | "openDays">; className?: string }) {
  const { t, lang } = useT();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(id); }, []);
  const s = openStatus(point, now);
  if (s.kind === "unknown") return null;
  const when = s.kind === "open" ? t("hours.until", { time: s.closes })
    : s.inDays === 0 ? t("hours.opensToday", { time: s.opens })
    : s.inDays === 1 ? t("hours.opensTomorrow", { time: s.opens })
    : t("hours.opensOn", { day: weekdayNames(lang)[s.day], time: s.opens });
  return (
    <span className={`av-open av-open--${s.kind} ${className ?? ""}`} role="status">
      <i aria-hidden="true" />
      <strong>{s.kind === "open" ? t("hours.open") : t("hours.closed")}</strong>
      <span>· {when}</span>
    </span>
  );
}
