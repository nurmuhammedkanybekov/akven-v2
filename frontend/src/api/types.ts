/** Mirrors the backend's response shapes (CatalogViews.java, AdminCatalogDtos.java). */
export type Category = "MEN" | "WOMEN" | "KIDS" | "BUNDLES";
export type Role = "CUSTOMER" | "STAFF" | "ADMIN";
export type TermKind = "SECTION" | "CUT";

export interface ImageView { url: string; alt: string }
export interface TermView { slug: string; name: string }
export interface TermInfo { slug: string; name: string; description: string | null }
export interface TermsView { sections: TermInfo[]; cuts: TermInfo[] }
export interface FacetOption { slug: string; name: string; count: number }
export interface Facets { category: Record<Category, number>; section: FacetOption[]; cut: FacetOption[] }

export interface PageResponse<T> { items: T[]; page: number; size: number; totalItems: number; totalPages: number }

// ---- shop (customer-facing: no cost price, no margin floor, by design) ----

export interface ProductSummary {
  slug: string;
  name: string;
  category: Category;
  section: TermView | null;
  cut: TermView | null;
  collection: string | null;
  minPrice: number | null;
  inStock: boolean;
  variantCount: number;
  image: ImageView | null;
  colors: string[];
}

export interface VariantView {
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  packSize: number | null;
  price: number;
  availableQty: number;
}

export interface ProductDetail {
  slug: string;
  name: string;
  category: Category;
  section: TermView | null;
  cut: TermView | null;
  collection: string | null;
  description: string | null;
  fabricComposition: string | null;
  quality: string | null;
  care: string | null;
  origin: string | null;
  images: ImageView[];
  variants: VariantView[];
}

// ---- auth ----

export interface AuthResponse { token: string; email: string; role: Role }

// ---- admin ----

export interface AdminTermRef { id: string; slug: string; name: string }
export interface AdminTerm {
  id: string; kind: TermKind; slug: string; name: string; description: string | null;
  position: number; active: boolean; productCount: number; version: number;
}
export interface AdminImage { id: string; url: string; alt: string; position: number }
export interface AdminVariant {
  id: string; sku: string; size: string | null; color: string | null; colorHex: string | null; packSize: number | null;
  price: number; costPrice: number; marginFloorPct: number;
  stockQty: number; reservedQty: number; availableQty: number; active: boolean; version: number;
}
export interface AdminProduct {
  id: string; slug: string; name: string; category: Category;
  section: AdminTermRef | null; cut: AdminTermRef | null;
  collection: string | null; description: string | null; fabricComposition: string | null;
  quality: string | null; care: string | null; origin: string | null;
  active: boolean; retiredAt: string | null; version: number;
  images: AdminImage[]; variants: AdminVariant[];
}
export interface AuditEntry {
  id: string; actorId: string; action: string; entityType: string; entityId: string;
  beforeState: string | null; afterState: string | null; correlationId: string; createdAt: string;
}

export interface ProductInput {
  slug?: string | null;
  name: string;
  category: Category;
  sectionId: string | null;
  cutId: string | null;
  collection: string | null;
  description: string | null;
  fabricComposition: string | null;
  quality: string | null;
  care: string | null;
  origin: string | null;
}

export interface VariantCreateInput {
  sku: string; size: string | null; color: string | null; colorHex: string | null; packSize: number | null;
  price: number; costPrice: number; marginFloorPct: number; stockQty: number;
}
export interface VariantUpdateInput {
  size: string | null; color: string | null; colorHex: string | null; packSize: number | null;
  price: number; stockQty: number; active: boolean; version?: number;
}
