import { api } from "./client";
import type {
  AdminProduct, AdminTerm, AdminVariant, AuditEntry, AuthResponse, Facets, PageResponse, ProductDetail,
  ProductInput, ProductSummary, TermKind, TermsView, VariantCreateInput, VariantUpdateInput, Category,
} from "./types";

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---- auth ----
export const login = (email: string, password: string) =>
  api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });

// ---- shop ----
export interface CatalogQuery {
  category?: Category; section?: string; cut?: string; q?: string; inStock?: boolean;
  sort?: string; page?: number; pageSize?: number;
}
export const listProducts = (query: CatalogQuery, signal?: AbortSignal) =>
  api<PageResponse<ProductSummary>>(`/api/products${qs({ ...query })}`, { signal });
export const getFacets = (query: CatalogQuery, signal?: AbortSignal) =>
  api<Facets>(`/api/products/facets${qs({ category: query.category, section: query.section, cut: query.cut, q: query.q, inStock: query.inStock })}`, { signal });
export const getTerms = () => api<TermsView>("/api/catalog/terms");
export const getProduct = (slug: string) => api<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`);

// ---- admin: products ----
export const adminListProducts = (p: { q?: string; status?: string; page?: number; pageSize?: number }) =>
  api<PageResponse<AdminProduct>>(`/api/admin/products${qs(p)}`);
export const adminGetProduct = (id: string) => api<AdminProduct>(`/api/admin/products/${id}`);
export const adminCreateProduct = (body: ProductInput) => api<AdminProduct>("/api/admin/products", { method: "POST", body });
export const adminUpdateProduct = (id: string, body: Omit<ProductInput, "slug">) =>
  api<AdminProduct>(`/api/admin/products/${id}`, { method: "PUT", body });
export const adminRetireProduct = (id: string) => api<void>(`/api/admin/products/${id}`, { method: "DELETE" });
export const adminRestoreProduct = (id: string) => api<AdminProduct>(`/api/admin/products/${id}/restore`, { method: "POST" });
export const adminProductAudit = (id: string) => api<AuditEntry[]>(`/api/admin/products/${id}/audit`);

// ---- admin: variants ----
export const adminCreateVariant = (productId: string, body: VariantCreateInput) =>
  api<AdminVariant>(`/api/admin/products/${productId}/variants`, { method: "POST", body });
export const adminUpdateVariant = (id: string, body: VariantUpdateInput) =>
  api<AdminVariant>(`/api/admin/variants/${id}`, { method: "PUT", body });
export const adminUpdatePricing = (id: string, body: { costPrice: number; marginFloorPct: number; version?: number }) =>
  api<AdminVariant>(`/api/admin/variants/${id}/pricing-policy`, { method: "PUT", body });

// ---- admin: photos ----
export const adminUploadImage = (productId: string, file: File, alt: string) => {
  const form = new FormData();
  form.append("file", file);
  if (alt) form.append("alt", alt);
  return api<AdminProduct>(`/api/admin/products/${productId}/images/upload`, { method: "POST", form });
};
export const adminReplaceImages = (productId: string, images: Array<{ url: string; alt: string }>) =>
  api<AdminProduct>(`/api/admin/products/${productId}/images`, { method: "PUT", body: { images } });

// ---- admin: sections and cuts ----
export const adminListTerms = (kind: TermKind) => api<AdminTerm[]>(`/api/admin/terms?kind=${kind}`);
export const adminCreateTerm = (kind: TermKind, name: string, description: string | null) =>
  api<AdminTerm>("/api/admin/terms", { method: "POST", body: { kind, name, description } });
export const adminUpdateTerm = (id: string, body: { name: string; description: string | null; active: boolean }) =>
  api<AdminTerm>(`/api/admin/terms/${id}`, { method: "PUT", body });
export const adminReorderTerms = (kind: TermKind, ids: string[]) =>
  api<AdminTerm[]>("/api/admin/terms/reorder", { method: "POST", body: { kind, ids } });
export const adminDeleteTerm = (id: string) => api<void>(`/api/admin/terms/${id}`, { method: "DELETE" });
