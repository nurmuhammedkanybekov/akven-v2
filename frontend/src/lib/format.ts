/** Prices are shown in one currency for now. The backend stores plain amounts (no currency column yet). */
export function formatPrice(amount: number, currency = "USD", locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** The price after a discount, rounded to cents the same way a shop would. */
export function discountedPrice(list: number, discountPct: number): number {
  return Math.round(list * (1 - discountPct / 100) * 100) / 100;
}
