import type { Category, ProductSummary } from "../api/types";

export const CATEGORY_LABEL: Record<Category, string> = { MEN: "Men", WOMEN: "Women", KIDS: "Kids", BUNDLES: "Bundles" };
export const CATEGORY_PATH: Record<Category, string> = { MEN: "/men", WOMEN: "/women", KIDS: "/kids", BUNDLES: "/bundles" };
export const CATEGORIES: Category[] = ["MEN", "WOMEN", "KIDS", "BUNDLES"];

/** "Men · Classic · Crew" for a card's small print; bundles have no section or cut. */
export function productMeta(p: Pick<ProductSummary, "category" | "section" | "cut">): string {
  return [CATEGORY_LABEL[p.category], p.section?.name, p.cut?.name].filter(Boolean).join(" · ");
}
