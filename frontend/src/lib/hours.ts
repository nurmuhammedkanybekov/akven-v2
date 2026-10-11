import type { PickupPoint } from "../api/types";

/**
 * Opening hours in Bishkek time (UTC+6 all year, no daylight saving), so "open now" is right wherever the visitor is.
 * Days are a bit each, Monday = 1 ... Sunday = 64, as the owners set them in the admin.
 */
const BISHKEK_OFFSET_MIN = 6 * 60;

export const EVERY_DAY = 127;

/** "08:00:00" or "08:00" → minutes after midnight. */
export function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** "08:00:00" → "8:00". */
export function shortTime(time: string): string {
  const [h, m] = time.split(":");
  return `${Number(h)}:${m}`;
}

/** Monday-based index (0 = Monday) and minutes after midnight, in Bishkek. */
export function bishkekNow(now: Date): { day: number; minute: number } {
  const t = new Date(now.getTime() + BISHKEK_OFFSET_MIN * 60_000);
  return { day: (t.getUTCDay() + 6) % 7, minute: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export const isOpenOn = (openDays: number, day: number) => (openDays & (1 << day)) !== 0;

export type OpenStatus =
  | { kind: "unknown" }
  | { kind: "open"; closes: string }
  | { kind: "closed"; opens: string; inDays: number; day: number };

/** Open now and until when, or when it opens next (today, tomorrow, or on a named day). */
export function openStatus(p: Pick<PickupPoint, "opensAt" | "closesAt" | "openDays">, now = new Date()): OpenStatus {
  if (!p.opensAt || !p.closesAt || p.openDays === 0) return { kind: "unknown" };
  const { day, minute } = bishkekNow(now);
  const open = minutes(p.opensAt), close = minutes(p.closesAt);
  if (isOpenOn(p.openDays, day) && minute >= open && minute < close) return { kind: "open", closes: shortTime(p.closesAt) };
  for (let k = 0; k < 8; k++) {
    const d = (day + k) % 7;
    if (!isOpenOn(p.openDays, d)) continue;
    if (k === 0 && minute >= open) continue;
    return { kind: "closed", opens: shortTime(p.opensAt), inDays: k, day: d };
  }
  return { kind: "unknown" };
}

/** Monday ... Sunday in the visitor's language ("пн", "дүй" ...), from the browser itself. */
export function weekdayNames(lang: string, style: "long" | "short" = "long"): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1)); // a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const name = new Date(monday.getTime() + i * 86_400_000).toLocaleDateString(lang, { weekday: style, timeZone: "UTC" });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}
