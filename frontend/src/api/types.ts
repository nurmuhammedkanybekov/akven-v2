/** Mirrors the backend's customer-facing views (CatalogViews.java). Costs and margin floors are not here on purpose. */
export type Category = "MEN" | "WOMEN" | "KIDS" | "BUNDLES";
export type Cut = "CREW" | "ANKLE" | "NO_SHOW" | "KNEE_HIGH";
export type Occasion = "EVERYDAY" | "SPORT" | "THERMAL" | "DRESS";

export interface ImageView { url: string; alt: string }

export interface ProductSummary {
  slug: string;
  name: string;
  category: Category;
  cut: Cut | null;
  occasion: Occasion | null;
  collection: string | null;
  minPrice: number | null;
  inStock: boolean;
  variantCount: number;
  image: ImageView | null;
}
