import type { Category, ProductSummary } from "../api/types";
import type { MessageKey } from "../i18n/en";

export const CATEGORY_LABEL: Record<Category, string> = { MEN: "Men", WOMEN: "Women", KIDS: "Kids", BUNDLES: "Bundles" };
/** The same names as translation keys, for screens that follow the chosen language. */
export const CATEGORY_KEY: Record<Category, MessageKey> = { MEN: "a.cat.MEN", WOMEN: "a.cat.WOMEN", KIDS: "a.cat.KIDS", BUNDLES: "a.cat.BUNDLES" };
export const CATEGORY_PATH: Record<Category, string> = { MEN: "/men", WOMEN: "/women", KIDS: "/kids", BUNDLES: "/bundles" };
export const CATEGORIES: Category[] = ["MEN", "WOMEN", "KIDS", "BUNDLES"];

/** "Men · Classic · Crew" for a card's small print; bundles have no section or cut. */
export function productMeta(p: Pick<ProductSummary, "category" | "section" | "cut">, categoryLabel?: string): string {
  return [categoryLabel ?? CATEGORY_LABEL[p.category], p.section?.name, p.cut?.name].filter(Boolean).join(" · ");
}
