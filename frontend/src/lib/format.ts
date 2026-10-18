/** Prices are shown in one currency for now. The backend stores plain amounts (no currency column yet). */
export function formatPrice(amount: number, currency = "USD", locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** The price after a discount, rounded to cents the same way a shop would. */
export function discountedPrice(list: number, discountPct: number): number {
  // Multiply before dividing and nudge by a hair, so half-cents round up exactly like the server does (9.50 at 15% is 8.08).
  return Math.round(list * (100 - discountPct) + 1e-9) / 100;
}

/** "30 Sep 2026, 18:16" in the visitor's own time zone. */
export function formatDateTime(iso: string, locale = "en-GB"): string {
  return new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A calendar date ("2026-10-28") as "28 Oct 2026", read as a date, not shifted by the visitor's time zone. */
export function formatDay(isoDate: string, locale = "en-GB"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
