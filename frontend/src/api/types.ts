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
  /** Pairs in one wholesale case, when the owners have entered it. */
  casePairs: number | null;
  price: number;
  availableQty: number;
  stockStatus: StockStatus;
  /** Set only while COMING_SOON. */
  restockEta: string | null;
  restockInDays: number | null;
}

export type StockStatus = "IN_STOCK" | "FEW_LEFT" | "COMING_SOON" | "SOLD_OUT";

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
  casePairs: number | null; incomingQty: number; restockEta: string | null;
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

// ---- cart and orders ----

export type FulfillmentMethod = "PICKUP" | "DELIVERY";
export type PaymentMethod = "APPLE_PAY" | "GOOGLE_PAY";
export type OrderStatus = "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
export type LineProblem = "NONE" | "UNAVAILABLE" | "SOLD_OUT" | "NOT_ENOUGH_STOCK";

export interface CartLineRequest { sku: string; quantity: number; negotiationSessionId?: string }

export interface QuoteLine {
  sku: string; productSlug: string | null; productName: string; variantLabel: string | null; colorHex: string | null;
  imageUrl: string | null; quantity: number; listPrice: number | null; discountPct: number | null; unitPrice: number | null;
  lineTotal: number | null; availableQty: number; problem: LineProblem; note: string | null;
}
/** The cart as one collection: pairs across all lines, the minimum, the reached step and the next one. */
export interface CollectionView {
  totalPairs: number; minimumPairs: number; tierDiscountPct: number;
  nextTier: { minPairs: number; discountPct: number; pairsToGo: number } | null;
  /** Set only while the cart is below the minimum. */
  minimumMessage: string | null;
}
export interface Quote { lines: QuoteLine[]; total: number; canCheckout: boolean; collection?: CollectionView }

export interface OrderItemView {
  sku: string; productName: string; productSlug: string | null; variantLabel: string | null; colorHex: string | null;
  imageUrl: string | null; quantity: number; listPrice: number; discountPct: number; unitPrice: number; lineTotal: number;
  discountSource?: DiscountSource;
}
export type DiscountSource = "NONE" | "TIER" | "NEGOTIATED";
export type Country = "KG" | "KZ" | "UZ" | "RU";
export interface OrderView {
  id: string; reference: string; status: OrderStatus; total: number; createdAt: string; paidAt: string | null;
  fulfilledAt: string | null; cancelledAt: string | null;
  fulfillment: { method: FulfillmentMethod; contactName: string; contactPhone: string; address: string | null; note: string | null; country?: Country | null };
  payment: { method: string; reference: string } | null;
  items: OrderItemView[];
  customerEmail: string | null;
  /** Pickup orders only. The code is shown to the customer, never to staff. */
  pickup?: { code: string | null; point: PickupPoint | null } | null;
}
export interface CheckoutBody {
  items: CartLineRequest[];
  fulfillment: { method: FulfillmentMethod; contactName: string; contactPhone: string; address: string | null; note: string | null; country?: Country | null };
  payment: { method: PaymentMethod; token: string };
}

// ---- negotiation ----

export interface NegotiateResponse {
  sessionId: string; reply: string; validatedDiscountPct: number; listPrice: number; offerPrice: number; expiresAt: string | null;
  /** Present only when the server runs in demo mode (AKVEN_DEMO_EXPOSE_PROPOSAL=true). */
  proposedDiscountPct?: number;
  /** Why this price: as offered, cut down by the shop's limit, or no discount. */
  outcome?: PriceOutcome;
}
export type PriceOutcome = "AS_OFFERED" | "LIMITED_BY_SHOP" | "LIST_PRICE";
export interface NegotiationSessionView {
  id: string; customerEmail: string; sku: string; productName: string; proposedDiscountPct: number | null;
  validatedDiscountPct: number | null; clamped: boolean; transcript: string | null; createdAt: string;
}

// ---- pricing, shop info and sizes ----

export interface PublicPricing { minOrderPairs: number; tiers: Array<{ minPairs: number; discountPct: number }> }
export interface PricingPolicy { minOrderPairs: number; trustedMinOrderPairs: number; trustedAfterOrders: number; fewLeftThreshold: number }
export interface PriceTier { id: string; minPairs: number; discountPct: number }

export type ContactKind = "INSTAGRAM" | "TELEGRAM" | "WHATSAPP" | "PHONE" | "EMAIL";
export interface ShopContact { id: string; kind: ContactKind; label: string | null; value: string; url: string; position: number; active: boolean }
export interface PickupPoint {
  id: string; name: string; market: string; section: string | null; passage: string | null; container: string;
  city: string; hours: string | null; directions: string | null; position: number; active: boolean;
}
export interface ShopInfo { contacts: ShopContact[]; pickupPoints: PickupPoint[] }

export type SizeSystem = "FOOT_CM" | "KR_MM" | "LOCAL" | "EU";
export interface SizeRange { min: number; max: number }
export interface SizeRow { id: string; label: string; footCm: SizeRange; krMm: SizeRange; local: SizeRange; eu: SizeRange; us: string }
export interface SizeChart { lang: string; columns: string[]; rows: SizeRow[] }
export interface SizeMatch { system: SizeSystem; size: number; labels: string[] }

// ---- owners' dashboard ----

export interface NegotiationStats {
  days: number;
  perDay: Array<{ date: string; offers: number; limitedByShop: number; averageDiscountPct: number | null; offersUsed: number }>;
  totals: { offers: number; limitedByShop: number; limitedPct: number | null; averageProposedPct: number | null;
            averageDiscountPct: number | null; offersUsed: number; conversionPct: number | null; negotiatedRevenue: number };
  topItems: Array<{ sku: string; productName: string; pairsSold: number; revenue: number }>;
  discountSources: Array<{ source: DiscountSource; lines: number }>;
}
export interface EvaluationResult { proposedPct: number; finalPct: number; limited: boolean; accepted: boolean; pricePerPair: number }
export interface EvaluationReport {
  aiSource: string; note: string;
  rows: Array<{ id: string; customer: string; message: string; quantity: number; listPrice: number; limitPct: number;
                walkAwayPct: number; rule: EvaluationResult; ai: EvaluationResult }>;
  rule: EvaluationSummary; ai: EvaluationSummary;
}
export interface EvaluationSummary { averageFinalPct: number | null; acceptedPct: number | null; limited: number; aboveLimit: number; revenue: number }
