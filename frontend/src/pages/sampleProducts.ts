import type { ProductSummary } from "../api/types";

const img = (slug: string, name: string) => ({ url: `/media/products/${slug}-1.svg`, alt: `${name}, Ak&Ven` });

/** Sample data in the exact shape of GET /api/products, used by the style guide and the tests. */
export const SAMPLE_PRODUCTS: ProductSummary[] = [
  { slug: "merino-dress-black", name: "Merino Dress Sock", category: "MEN", cut: "CREW", occasion: "DRESS", collection: "Office", minPrice: 8, inStock: true, variantCount: 2, image: img("merino-dress-black", "Merino Dress Sock") },
  { slug: "soft-cotton-ankle", name: "Soft Cotton Ankle", category: "WOMEN", cut: "ANKLE", occasion: "EVERYDAY", collection: "Everyday", minPrice: 12.5, inStock: true, variantCount: 2, image: img("soft-cotton-ankle", "Soft Cotton Ankle") },
  { slug: "thermal-knee-high", name: "Thermal Knee-High", category: "MEN", cut: "KNEE_HIGH", occasion: "THERMAL", collection: "Winter", minPrice: 9.5, inStock: false, variantCount: 2, image: img("thermal-knee-high", "Thermal Knee-High") },
  { slug: "bazaar-family-pack", name: "Bazaar Family Pack", category: "BUNDLES", cut: null, occasion: null, collection: "Family", minPrice: 34, inStock: true, variantCount: 1, image: img("bazaar-family-pack", "Bazaar Family Pack") },
];
