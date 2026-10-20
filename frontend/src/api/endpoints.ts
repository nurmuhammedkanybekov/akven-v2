import { api, apiFile } from "./client";
import type {
  StockWaiting,
  ShopSummary,
  AdminProduct, AdminTerm, AdminVariant, AuditEntry, AuthResponse, Facets, PageResponse, ProductDetail,
  ProductInput, ProductSummary, TermKind, TermsView, VariantCreateInput, VariantUpdateInput, Category,
  CartLineRequest, CheckoutBody, OrderStatus, OrderView, Quote, NegotiateResponse, NegotiationSessionView,
  PublicPricing, PricingPolicy, PriceTier, ShopInfo, ShopContact, ContactKind, PickupPoint, SizeChart, SizeMatch, SizeRow,
  FamilyMember, FamilyMemberInput, ProductReviews, ShowcaseReview, MyReview, ModerationLine, ReviewStatus, DayPoint,
  SizeSystem, NegotiationStats, EvaluationReport, Account, AssistantMode, AssistantStatus, AssistantTry, AuditLine, CustomerAccount, TeamRole,
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

export const register = (email: string, password: string) =>
  api<AuthResponse>("/api/auth/register", { method: "POST", body: { email, password } });

// ---- cart and orders ----
export const quoteCart = (items: CartLineRequest[], signal?: AbortSignal) =>
  api<Quote>("/api/cart/quote", { method: "POST", body: { items }, signal });
/** idempotencyKey: a fresh random value per checkout attempt; sending it again returns the same order instead of a second one. */
export const checkout = (body: CheckoutBody, idempotencyKey: string) =>
  api<OrderView>("/api/orders", { method: "POST", body, headers: { "Idempotency-Key": idempotencyKey } });
export const listMyOrders = () => api<OrderView[]>("/api/orders");
export const getMyOrder = (id: string) => api<OrderView>(`/api/orders/${id}`);
export const cancelMyOrder = (id: string) => api<OrderView>(`/api/orders/${id}/cancel`, { method: "POST" });
export const adminListOrders = (p: { status?: OrderStatus; page?: number; pageSize?: number }) =>
  api<PageResponse<OrderView>>(`/api/admin/orders${qs(p)}`);
export const adminGetOrder = (id: string) => api<OrderView>(`/api/admin/orders/${id}`);
export const adminFulfilOrder = (id: string) => api<OrderView>(`/api/admin/orders/${id}/fulfil`, { method: "POST" });
export const adminCancelOrder = (id: string) => api<OrderView>(`/api/admin/orders/${id}/cancel`, { method: "POST" });

// ---- negotiation ----
/** sessionId continues the conversation; language is the one the assistant answers in. */
export const negotiate = (variantSku: string, message: string, quantity: number, sessionId?: string | null, language?: string, currency?: string) =>
  api<NegotiateResponse>("/api/negotiate", { method: "POST", body: { variantSku, message, quantity, sessionId: sessionId ?? undefined, language, currency } });
export const adminGetNegotiation = (id: string) => api<NegotiationSessionView>(`/api/admin/negotiations/${id}`);
export const adminListNegotiations = (p: { page?: number; pageSize?: number }) =>
  api<PageResponse<NegotiationSessionView>>(`/api/admin/negotiations${qs(p)}`);

// ---- shop ----
export interface CatalogQuery {
  category?: Category; section?: string; cut?: string; q?: string; inStock?: boolean;
  sort?: string; page?: number; pageSize?: number;
}
export const listProducts = (query: CatalogQuery, signal?: AbortSignal) =>
  api<PageResponse<ProductSummary>>(`/api/products${qs({ ...query })}`, { signal });
export const getFacets = (query: CatalogQuery, signal?: AbortSignal) =>
  api<Facets>(`/api/products/facets${qs({ category: query.category, section: query.section, cut: query.cut, q: query.q, inStock: query.inStock })}`, { signal });
/** The socks people buy most; `sold` says how many of the list really sold (the rest are the newest in stock). */
export const getBestsellers = (category: Category | null, limit = 8, signal?: AbortSignal) =>
  api<{ items: ProductSummary[]; sold: number }>(`/api/catalog/bestsellers${qs({ category, limit })}`, { signal });
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
export const adminReplaceImages = (productId: string, images: Array<{ url: string; alt: string; color?: string | null }>) =>
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

// ---- pricing (public ladder; owners change it) ----
export const getPricing = (signal?: AbortSignal) => api<PublicPricing>("/api/pricing", { signal });
export const adminGetPolicy = () => api<PricingPolicy>("/api/admin/pricing/policy");
export const adminUpdatePolicy = (body: PricingPolicy) => api<PricingPolicy>("/api/admin/pricing/policy", { method: "PUT", body });
export const adminListTiers = () => api<PriceTier[]>("/api/admin/pricing/tiers");
export const adminCreateTier = (body: { minPairs: number; discountPct: number }) => api<PriceTier>("/api/admin/pricing/tiers", { method: "POST", body });
export const adminUpdateTier = (id: string, body: { minPairs: number; discountPct: number }) =>
  api<PriceTier>(`/api/admin/pricing/tiers/${id}`, { method: "PUT", body });
export const adminDeleteTier = (id: string) => api<void>(`/api/admin/pricing/tiers/${id}`, { method: "DELETE" });

// ---- shop info: contacts and the stall ----
export const getShopInfo = (signal?: AbortSignal) => api<ShopInfo>("/api/shop/info", { signal });
export interface ContactInput { kind: ContactKind; label: string | null; value: string; position: number; active: boolean }
export const adminListContacts = () => api<ShopContact[]>("/api/admin/shop/contacts");
export const adminCreateContact = (body: ContactInput) => api<ShopContact>("/api/admin/shop/contacts", { method: "POST", body });
export const adminUpdateContact = (id: string, body: ContactInput) => api<ShopContact>(`/api/admin/shop/contacts/${id}`, { method: "PUT", body });
export const adminDeleteContact = (id: string) => api<void>(`/api/admin/shop/contacts/${id}`, { method: "DELETE" });
export type PickupPointInput = Omit<PickupPoint, "id">;
export const adminListPickupPoints = () => api<PickupPoint[]>("/api/admin/shop/pickup-points");
export const adminCreatePickupPoint = (body: PickupPointInput) => api<PickupPoint>("/api/admin/shop/pickup-points", { method: "POST", body });
export const adminUpdatePickupPoint = (id: string, body: PickupPointInput) =>
  api<PickupPoint>(`/api/admin/shop/pickup-points/${id}`, { method: "PUT", body });
export const adminHandOver = (code: string, phoneEnd: string) =>
  api<OrderView>("/api/admin/orders/handover", { method: "POST", body: { code, phoneEnd } });

// ---- sizes ----
export const getSizeChart = (lang: string, signal?: AbortSignal) => api<SizeChart>(`/api/sizes${qs({ lang })}`, { signal });
export const findSize = (system: SizeSystem, size: number) => api<SizeMatch>(`/api/sizes/find${qs({ system, size })}`);
export type SizeRowInput = {
  label: string; footCmMin: number; footCmMax: number; krMmMin: number; krMmMax: number; localMin: number; localMax: number;
  euMin: number; euMax: number; usLabel: string; position: number;
};
export const adminCreateSize = (body: SizeRowInput) => api<SizeRow>("/api/admin/sizes", { method: "POST", body });
export const adminUpdateSize = (id: string, body: SizeRowInput) => api<SizeRow>(`/api/admin/sizes/${id}`, { method: "PUT", body });
export const adminDeleteSize = (id: string) => api<void>(`/api/admin/sizes/${id}`, { method: "DELETE" });

// ---- stock on the way ----
export const adminUpdateSupply = (id: string, body: { casePairs: number | null; incomingQty: number; restockEta: string | null; version?: number }) =>
  api<AdminVariant>(`/api/admin/variants/${id}/supply`, { method: "PUT", body });

// ---- owners' dashboard ----
export const adminSummary = (days: number) => api<ShopSummary>(`/api/admin/summary${qs({ days })}`);
export const adminNegotiationStats = (days: number) => api<NegotiationStats>(`/api/admin/negotiations/stats${qs({ days })}`);
export const adminEvaluation = () => api<EvaluationReport>("/api/admin/negotiations/evaluation");

// ---- accounts and the audit log (super admin); customers (owners) ----
export const adminListAccounts = () => api<Account[]>("/api/admin/accounts");
export const adminCreateAccount = (body: { email: string; displayName: string | null; role: TeamRole; password: string }) =>
  api<Account>("/api/admin/accounts", { method: "POST", body });
export const adminUpdateAccount = (id: string, body: { displayName: string | null; role: TeamRole; active: boolean }) =>
  api<Account>(`/api/admin/accounts/${id}`, { method: "PUT", body });
export const adminResetPassword = (id: string, password: string) =>
  api<void>(`/api/admin/accounts/${id}/password`, { method: "PUT", body: { password } });
export const adminListCustomers = (p: { q?: string; page?: number; pageSize?: number }) =>
  api<PageResponse<CustomerAccount>>(`/api/admin/customers${qs(p)}`);
export const adminSetTrusted = (id: string, trusted: boolean) =>
  api<{ customerId: string; trusted: boolean }>(`/api/admin/customers/${id}/trusted`, { method: "PUT", body: { trusted } });
export const adminResetCustomerPassword = (id: string, password: string) =>
  api<void>(`/api/admin/customers/${id}/password`, { method: "PUT", body: { password } });
export const adminSetCustomerActive = (id: string, active: boolean) =>
  api<CustomerAccount>(`/api/admin/customers/${id}/active`, { method: "PUT", body: { active } });
export const adminAuditLog = (p: { page?: number; pageSize?: number }) => api<PageResponse<AuditLine>>(`/api/admin/audit${qs(p)}`);

// ---- the assistant (super admin) ----
export const adminAssistantStatus = () => api<AssistantStatus>("/api/admin/assistant");
export const adminSetAssistantMode = (mode: AssistantMode) => api<AssistantStatus>("/api/admin/assistant", { method: "PUT", body: { mode } });
export const adminTryAssistant = (body: { sku: string; message: string; quantity: number; language: string }) =>
  api<AssistantTry>("/api/admin/assistant/try", { method: "POST", body });
export const adminLiveEvaluation = () => api<EvaluationReport>("/api/admin/assistant/evaluation", { method: "POST", body: {} });

// ---- "tell me when it is back" ----
// ---- reviews ----
export const getReviews = (slug: string, signal?: AbortSignal) => api<ProductReviews>(`/api/products/${encodeURIComponent(slug)}/reviews`, { signal });
export const getShowcaseReviews = (limit = 6, signal?: AbortSignal) => api<ShowcaseReview[]>(`/api/catalog/reviews${qs({ limit })}`, { signal });
export const getMyReview = (slug: string) => api<MyReview>(`/api/reviews/${encodeURIComponent(slug)}/mine`);
export const writeReview = (slug: string, body: { rating: number; author: string | null; body: string }) =>
  api<MyReview>(`/api/reviews/${encodeURIComponent(slug)}`, { method: "PUT", body });
export const adminReviews = (status?: ReviewStatus) => api<ModerationLine[]>(`/api/admin/reviews${qs({ status })}`);
export const adminModerateReview = (id: string, status: ReviewStatus) => api<void>(`/api/admin/reviews/${id}`, { method: "PUT", body: { status } });

// ---- catalogue extras ----
export const getMatching = (slug: string, signal?: AbortSignal) => api<ProductSummary[]>(`/api/products/${encodeURIComponent(slug)}/matching`, { signal });
export const searchProducts = (q: string, signal?: AbortSignal) => api<PageResponse<ProductSummary>>(`/api/products${qs({ q, pageSize: 6 })}`, { signal });

// ---- saved socks in the account ----
export const getSavedRemote = () => api<ProductSummary[]>("/api/saved");
export const saveRemote = (slug: string) => api<ProductSummary[]>(`/api/saved/${encodeURIComponent(slug)}`, { method: "PUT", body: {} });
export const unsaveRemote = (slug: string) => api<ProductSummary[]>(`/api/saved/${encodeURIComponent(slug)}`, { method: "DELETE", body: {} });
export const mergeSaved = (slugs: string[]) => api<ProductSummary[]>("/api/saved/merge", { method: "POST", body: { slugs } });

// ---- owners: sales by day and the orders file ----
/** Downloads the orders of the last N days as a CSV file (owners only). */
export async function downloadOrdersCsv(days = 90) {
  const blob = await apiFile(`/api/admin/orders/export${qs({ days })}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `akven-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const adminDaily = (days = 30) => api<DayPoint[]>(`/api/admin/summary/daily${qs({ days })}`);

// ---- the customer's family ----
export const getFamily = () => api<FamilyMember[]>("/api/family");
export const saveFamily = (members: FamilyMemberInput[]) => api<FamilyMember[]>("/api/family", { method: "PUT", body: { members } });

export const myStockRequests = () => api<string[]>("/api/stock-requests");
export const requestStock = (sku: string) => api<string[]>(`/api/stock-requests/${encodeURIComponent(sku)}`, { method: "PUT", body: {} });
export const cancelStockRequest = (sku: string) => api<string[]>(`/api/stock-requests/${encodeURIComponent(sku)}`, { method: "DELETE", body: {} });
export const adminStockRequests = () => api<StockWaiting[]>("/api/admin/stock-requests");
export const adminAnswerStockRequest = (id: string) => api<void>(`/api/admin/stock-requests/${id}/answered`, { method: "PUT", body: {} });
