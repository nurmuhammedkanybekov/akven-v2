/** Mirrors the backend's response shapes (CatalogViews.java, AdminCatalogDtos.java). */
export type Category = "MEN" | "WOMEN" | "KIDS" | "BUNDLES";
export type Role = "CUSTOMER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
export type TermKind = "SECTION" | "CUT";

/** color: the variants' colour this picture shows; null or missing for the product as a whole. */
export interface ImageView { url: string; alt: string; color?: string | null }
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
  /** The cheapest single pair: a pack price divided by its pairs. */
  minPairPrice?: number | null;
  inStock: boolean;
  variantCount: number;
  image: ImageView | null;
  /** The second image, shown when the card is hovered. */
  hoverImage?: ImageView | null;
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
  /** Pairs of this sock in paid orders over the last seven days (packs count their pairs). */
  pairsSoldThisWeek?: number;
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
export interface AdminImage { id: string; url: string; alt: string; position: number; color?: string | null }
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
  /** Set when the order goes out as a gift box. */
  gift?: GiftInput | null;
}
export interface CheckoutBody {
  items: CartLineRequest[];
  fulfillment: { method: FulfillmentMethod; contactName: string; contactPhone: string; address: string | null; note: string | null; country?: Country | null };
  payment: { method: PaymentMethod; token: string };
  gift?: GiftInput | null;
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
  quantity?: number; turns?: NegotiationTurn[];
}
/** One message and answer; assistant is "llm", "rules" or "rules-fallback". */
export interface NegotiationTurn {
  position: number; customerMessage: string; reply: string; language: string; assistant: string; quantity: number;
  proposedDiscountPct: number; validatedDiscountPct: number; createdAt: string;
}

// ---- pricing, shop info and sizes ----

export interface PublicPricing { minOrderPairs: number; tiers: Array<{ minPairs: number; discountPct: number }>; somPerUsd?: number; somRounding?: number; rubPerUsd?: number; rubRounding?: number }
/** somPerUsd: som for one dollar, as the owners set it; somRounding: som prices are rounded to this (1, 5, 10, 50, 100). */
export interface PricingPolicy { minOrderPairs: number; trustedMinOrderPairs: number; trustedAfterOrders: number; fewLeftThreshold: number; somPerUsd: number; somRounding: number; rubPerUsd: number; rubRounding: number }
export interface PriceTier { id: string; minPairs: number; discountPct: number }

export type ContactKind = "INSTAGRAM" | "TELEGRAM" | "WHATSAPP" | "PHONE" | "EMAIL" | "FACEBOOK";
export interface ShopContact { id: string; kind: ContactKind; label: string | null; value: string; url: string; position: number; active: boolean }
export interface PickupPoint {
  id: string; name: string; market: string; section: string | null; passage: string | null; container: string;
  city: string; hours: string | null; directions: string | null; position: number; active: boolean;
  /** "08:00:00", Bishkek time; null until the owners set them. openDays: a bit per day, Monday = 1 ... Sunday = 64. */
  opensAt: string | null; closesAt: string | null; openDays: number;
}
export interface ShopInfo { contacts: ShopContact[]; pickupPoints: PickupPoint[] }

export type SizeSystem = "FOOT_CM" | "KR_MM" | "LOCAL" | "EU";
export interface SizeRange { min: number; max: number }
export interface SizeRow { id: string; label: string; footCm: SizeRange; krMm: SizeRange; local: SizeRange; eu: SizeRange; us: string }
export interface SizeChart { lang: string; columns: string[]; rows: SizeRow[] }
export interface SizeMatch { system: SizeSystem; size: number; labels: string[] }

// ---- owners' dashboard ----

export interface ShopSummary {
  days: number;
  sales: { orders: number; revenue: number; pairs: number; averageOrder: number | null };
  toHandOver: number;
  fewLeftThreshold: number;
  soldOut: number;
  lowStock: Array<{ productId: string; slug: string; productName: string; sku: string; color: string | null; size: string | null;
                    available: number; incoming: number; restockEta: string | null }>;
}

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
                walkAwayPct: number; rule: EvaluationResult; ai: EvaluationResult; aiReply: string | null }>;
  rule: EvaluationSummary; ai: EvaluationSummary;
}
export interface EvaluationSummary { averageFinalPct: number | null; acceptedPct: number | null; limited: number; aboveLimit: number; revenue: number }

// ---- accounts, audit log and the assistant (super admin) ----
export type TeamRole = "STAFF" | "ADMIN" | "SUPER_ADMIN";
export interface Account { id: string; email: string; displayName: string | null; role: TeamRole; active: boolean; createdAt: string }
export interface CustomerAccount { id: string; email: string; trusted: boolean; active: boolean; createdAt: string }
export interface AuditLine { id: string; at: string; actor: string; action: string; entityType: string; entityId: string; before: string | null; after: string | null }
export type AssistantMode = "ai" | "rules";
export interface AssistantStatus { mode: AssistantMode; aiConfigured: boolean; model: string; endpointHost: string | null; answersLast7Days: Record<string, number> }
export interface AssistantTry { assistant: string; proposedPct: number; validatedPct: number; offerPrice: number; reply: string; millis: number }

/** A sold-out option and the customers waiting for it (the shop team's list). */
export interface StockWaiting {
  sku: string; productName: string; productSlug: string; color: string | null; size: string | null;
  available: number; incoming: number; restockEta: string | null;
  customers: Array<{ requestId: string; email: string; since: string }>;
}

// ---- family profiles and gift boxes ----
export type FamilyRole = "dad" | "mom" | "son" | "daughter" | "grandpa" | "grandma" | "baby";
export interface FamilyMemberInput { name: string | null; role: FamilyRole; shoeSize: number; pairs: number; birthday: string | null }
export interface FamilyMember extends FamilyMemberInput { id: string }
export type GiftBoxColour = "KRAFT" | "NAVY" | "RED";
export type GiftRibbon = "GOLD" | "RED" | "WHITE";
export interface GiftInput { box: GiftBoxColour; ribbon: GiftRibbon; to: string | null; from: string | null; message: string | null; hidePrices: boolean }

// ---- reviews, sales by day ----
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface ReviewView { id: string; rating: number; author: string | null; body: string; createdAt: string }
export interface ProductReviews { count: number; average: number | null; counts: number[]; reviews: ReviewView[] }
export interface MyReview { canReview: boolean; status: ReviewStatus | null; rating: number | null; author: string | null; body: string | null }
export interface ShowcaseReview extends ReviewView { productSlug: string; productName: string }
export interface ModerationLine extends ReviewView { status: ReviewStatus; productSlug: string | null; productName: string; customerEmail: string }
export interface DayPoint { date: string; orders: number; revenue: number; pairs: number }
