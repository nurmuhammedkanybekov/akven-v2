import type { ProductInput, VariantCreateInput } from "../api/types";
import type { MessageKey } from "../i18n/en";
import type { Translate } from "../i18n/I18n";

/** "Ak&Ven Mid-Long Socks" + Navy + M + 3 pairs becomes AVML-NAV-M-3: short, readable, unique enough to edit. */
export function suggestSku(slugOrName: string, color: string | null, size: string | null, pack: number | null): string {
  const letters = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const abbr = slugOrName.split(/[^a-z0-9]+/i).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 4) || "AKV";
  return [abbr, letters(color ?? "").slice(0, 3), letters(size ?? "").slice(0, 3), pack ?? ""].filter((p) => p !== "").join("-").slice(0, 64);
}

export interface VariantDraft {
  color: string; colorHex: string | null; size: string; packSize: string;
  price: string; costPrice: string; marginFloorPct: string; stockQty: string; sku: string; skuTouched: boolean;
}

export const emptyDraft = (): VariantDraft => ({
  color: "", colorHex: null, size: "", packSize: "1", price: "", costPrice: "", marginFloorPct: "15", stockQty: "0", sku: "", skuTouched: false,
});

/** A draft row the owner never touched is ignored instead of being an error. */
export const isBlankDraft = (d: VariantDraft) => !d.color.trim() && !d.size.trim() && !d.price.trim() && !d.costPrice.trim();

export function draftToInput(d: VariantDraft, fallbackName: string, t: Translate): { input?: VariantCreateInput; autoSku?: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const price = num(d.price), cost = num(d.costPrice), floor = num(d.marginFloorPct), stock = num(d.stockQty);
  const pack = d.packSize.trim() === "" ? null : num(d.packSize);
  if (!(price >= 0)) errors.price = t("a.v.errPrice");
  if (!(cost >= 0)) errors.costPrice = t("a.v.errCost");
  else if (price >= 0 && price < cost) errors.price = t("a.v.errBelowCost");
  if (!(floor >= 0 && floor <= 100)) errors.marginFloorPct = t("a.v.errPct");
  if (!(stock >= 0) || !Number.isInteger(stock)) errors.stockQty = t("a.v.errStock");
  if (pack !== null && !(pack > 0 && Number.isInteger(pack))) errors.packSize = t("a.v.errPack");
  const sku = d.sku.trim() || suggestSku(fallbackName, d.color || null, d.size || null, pack);
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    autoSku: !d.skuTouched || !d.sku.trim(),
    input: { sku, size: d.size.trim() || null, color: d.color.trim() || null, colorHex: d.colorHex, packSize: pack, price, costPrice: cost, marginFloorPct: floor, stockQty: stock },
  };
}

export const blankToNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

export function emptyProductInput(): ProductInput {
  return { name: "", category: "MEN", sectionId: null, cutId: null, collection: null, description: null, fabricComposition: null, quality: null, care: null, origin: "Korea" };
}

/** What an audit entry means, in words; actions without a text show their code. */
export function actionLabel(action: string, t: Translate): string {
  const key = `a.action.${action}` as MessageKey;
  const text = t(key);
  return text === key ? action : text;
}
