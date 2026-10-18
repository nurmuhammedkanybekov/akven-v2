import { useSyncExternalStore } from "react";
import { useT } from "../i18n/I18n";
import { formatPrice } from "../lib/format";
import { usePricing } from "./useShopInfo";

/**
 * Prices in US dollars, Kyrgyz som or Russian roubles. The shop keeps every price in dollars (what the wallet charges);
 * som and roubles are worked out with the rate and rounding the owners set under Pricing, exactly as the server rounds
 * som in the chat. The visitor's choice is remembered on this device; until they choose, Russian and Kyrgyz read som
 * and English reads dollars. Without a rate (offline, still loading) prices stay in dollars rather than guess.
 */
export type Currency = "USD" | "KGS" | "RUB";

const KEY = "akven-currency";
const listeners = new Set<() => void>();

function readChoice(): Currency | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "USD" || v === "KGS" || v === "RUB" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function setCurrency(c: Currency) {
  try { localStorage.setItem(KEY, c); } catch { /* kept for this visit only */ }
  listeners.forEach((l) => l());
}

/** "1 250" with a thin non-breaking space between thousands, the way prices are written in Bishkek. */
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** A dollar amount in som, rounded to the owners' step (half up, like the server). */
export function toSom(usd: number, rate: number, step: number): number {
  return Math.round((usd * rate) / step + 1e-9) * step;
}

export function useMoney() {
  const { lang } = useT();
  const pricing = usePricing();
  const chosen = useSyncExternalStore(subscribe, readChoice, () => null);
  const currency: Currency = chosen ?? (lang === "en" ? "USD" : "KGS");
  const rate = pricing?.somPerUsd ? Number(pricing.somPerUsd) : null;
  const step = pricing?.somRounding ?? 10;
  const rubRate = pricing?.rubPerUsd ? Number(pricing.rubPerUsd) : null;
  const rubStep = pricing?.rubRounding ?? 10;
  const inSom = currency === "KGS" && rate !== null;
  const inRub = currency === "RUB" && rubRate !== null;
  const unit = lang === "en" ? "som" : "сом";
  return {
    currency,
    /** What prices are actually shown in right now (som and roubles need their rate). */
    shown: (inSom ? "KGS" : inRub ? "RUB" : "USD") as Currency,
    setCurrency,
    money: (usd: number) => (inSom ? `${grouped(toSom(usd, rate!, step))} ${unit}`
      : inRub ? `${grouped(toSom(usd, rubRate!, rubStep))} ₽` : formatPrice(usd)),
    /** Always in dollars, for what the wallet actually charges. */
    usd: (usd: number) => formatPrice(usd),
  };
}

/** $ · СОМ · ₽, next to the language switch. */
export function CurrencySwitch({ className }: { className?: string }) {
  const { t } = useT();
  const { currency, setCurrency: choose } = useMoney();
  return (
    <div className={`av-langs ${className ?? ""}`} role="group" aria-label={t("cur.label")}>
      <button type="button" aria-pressed={currency === "USD"} aria-label={t("cur.usd")} onClick={() => choose("USD")}>$</button>
      <button type="button" aria-pressed={currency === "KGS"} aria-label={t("cur.kgs")} onClick={() => choose("KGS")}>{t("cur.somShort")}</button>
      <button type="button" aria-pressed={currency === "RUB"} aria-label={t("cur.rub")} onClick={() => choose("RUB")}>₽</button>
    </div>
  );
}
