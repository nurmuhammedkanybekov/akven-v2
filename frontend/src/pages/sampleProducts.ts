import type { ProductSummary } from "../api/types";

const img = (slug: string, name: string) => ({ url: `/media/products/${slug}-1.svg`, alt: `${name}, Ak&Ven` });

/** Sample data in the exact shape of GET /api/products, used by the style guide and the tests. */
export const SAMPLE_PRODUCTS: ProductSummary[] = [
  { slug: "merino-dress-black", name: "Merino Dress Sock", category: "MEN", section: { slug: "classic", name: "Classic" }, cut: { slug: "crew", name: "Crew" }, collection: "Office", minPrice: 8, inStock: true, variantCount: 2, image: img("merino-dress-black", "Merino Dress Sock"), colors: ["#1F1D1A", "#1F2A44"] },
  { slug: "soft-cotton-ankle", name: "Soft Cotton Ankle", category: "WOMEN", section: { slug: "casual", name: "Casual" }, cut: { slug: "ankle", name: "Ankle" }, collection: "Everyday", minPrice: 12.5, inStock: true, variantCount: 2, image: img("soft-cotton-ankle", "Soft Cotton Ankle"), colors: ["#DCCBB2", "#E0A7A0"] },
  { slug: "thermal-knee-high", name: "Thermal Knee-High", category: "MEN", section: { slug: "thermal", name: "Thermal" }, cut: { slug: "knee-high", name: "Knee-high" }, collection: "Winter", minPrice: 9.5, inStock: false, variantCount: 2, image: img("thermal-knee-high", "Thermal Knee-High"), colors: ["#4D4943", "#6B4A32"] },
  { slug: "bazaar-family-pack", name: "Bazaar Family Pack", category: "BUNDLES", section: null, cut: null, collection: "Family", minPrice: 34, inStock: true, variantCount: 1, image: img("bazaar-family-pack", "Bazaar Family Pack"), colors: [] },
];
