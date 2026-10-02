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
