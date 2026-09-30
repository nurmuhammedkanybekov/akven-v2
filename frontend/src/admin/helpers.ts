import type { ProductInput, VariantCreateInput } from "../api/types";

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

export function draftToInput(d: VariantDraft, fallbackName: string): { input?: VariantCreateInput; autoSku?: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const price = num(d.price), cost = num(d.costPrice), floor = num(d.marginFloorPct), stock = num(d.stockQty);
  const pack = d.packSize.trim() === "" ? null : num(d.packSize);
  if (!(price >= 0)) errors.price = "Enter a price.";
  if (!(cost >= 0)) errors.costPrice = "Enter what it costs you.";
  else if (price >= 0 && price < cost) errors.price = "The price cannot be below the cost.";
  if (!(floor >= 0 && floor <= 100)) errors.marginFloorPct = "Enter a number from 0 to 100.";
  if (!(stock >= 0) || !Number.isInteger(stock)) errors.stockQty = "Enter a whole number of pairs.";
  if (pack !== null && !(pack > 0 && Number.isInteger(pack))) errors.packSize = "Enter a whole number, or leave empty.";
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

export const ACTION_LABEL: Record<string, string> = {
  PRODUCT_CREATED: "Product created", PRODUCT_UPDATED: "Details changed", PRODUCT_RETIRED: "Removed from the shop",
  PRODUCT_RESTORED: "Put back in the shop", PRODUCT_IMAGES_REPLACED: "Photos rearranged or removed", PRODUCT_IMAGE_ADDED: "Photo added",
  VARIANT_CREATED: "Colour or size added", VARIANT_UPDATED: "Colour or size changed", VARIANT_PRICING_POLICY_UPDATED: "Cost or discount limit changed",
};
