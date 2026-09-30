import type { Category, Cut, Occasion, ProductSummary } from "../api/types";

export const CATEGORY_LABEL: Record<Category, string> = { MEN: "Men", WOMEN: "Women", KIDS: "Kids", BUNDLES: "Bundles" };
export const CUT_LABEL: Record<Cut, string> = { CREW: "Crew", ANKLE: "Ankle", NO_SHOW: "No-show", KNEE_HIGH: "Knee-high" };
export const OCCASION_LABEL: Record<Occasion, string> = { EVERYDAY: "Everyday", SPORT: "Sport", THERMAL: "Thermal", DRESS: "Dress" };

/** "Men · Crew · Sport" for a card's small print; bundles have no cut or occasion. */
export function productMeta(p: Pick<ProductSummary, "category" | "cut" | "occasion">): string {
  return [CATEGORY_LABEL[p.category], p.cut && CUT_LABEL[p.cut], p.occasion && OCCASION_LABEL[p.occasion]]
    .filter(Boolean).join(" · ");
}
