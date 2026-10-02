-- Ak&Ven core schema.
--
-- Design notes (why it looks like this):
--  * Every mutable table carries created_at/updated_at (kept correct by a
--    trigger, so it's true even for a row touched outside the app) plus an
--    optimistic-locking `version` column on rows with concurrent writers
--    (variant stock/price, order status, user role) — cheap insurance
--    against lost updates without pessimistic locking.
--  * Money is NUMERIC, never FLOAT/DOUBLE — rounding errors on prices are
--    not acceptable in a commerce system.
--  * Products are soft-deleted (is_active/retired_at) instead of hard
--    deleted: a retired product must stay intact for historical orders.
--  * CHECK constraints enforce the same domain rules the application layer
--    enforces — defense in depth, and the actual source of truth if
--    application code ever has a bug (see the margin-safety CHECK on
--    negotiation_session below, which mirrors FR-5's invariant in the DB).
--  * Foreign keys default to ON DELETE RESTRICT (no silent cascading data
--    loss); order_item is the one deliberate exception.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Shared trigger: keeps updated_at correct without relying on every write
-- path in the app remembering to set it by hand.
create or replace function set_updated_at()
    returns trigger
    language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ── Users ────────────────────────────────────────────────────────────────
create table app_user (
    id             uuid primary key default gen_random_uuid(),
    email          varchar(255) not null,
    password_hash  varchar(255) not null,
    role           varchar(20)  not null
                       constraint app_user_role_chk check (role in ('CUSTOMER', 'STAFF', 'ADMIN')),
    is_active      boolean      not null default true,
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now(),
    version        integer      not null default 0
);

-- Case-insensitive uniqueness: "a@x.com" and "A@X.com" are the same account.
create unique index app_user_email_lower_uq on app_user (lower(email));

create trigger app_user_set_updated_at
    before update on app_user
    for each row execute function set_updated_at();

comment on table app_user is 'Customers, staff, and admins in one table, gated by role (RBAC) — not separate schemas or services.';
comment on column app_user.role is 'CUSTOMER / STAFF / ADMIN — mirrors com.akven.thesis.user.Role; kept in sync by the CHECK constraint.';

-- ── Catalog ──────────────────────────────────────────────────────────────
create table product (
    id                  uuid primary key default gen_random_uuid(),
    slug                varchar(160) not null,
    name                varchar(255) not null,
    collection          varchar(255),
    description         varchar(2000),
    fabric_composition  varchar(255),
    is_active           boolean not null default true,
    retired_at          timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    version             integer not null default 0,
    constraint product_slug_uq unique (slug),
    constraint product_retired_consistency_chk
        check ( (is_active and retired_at is null) or (not is_active) )
);

create index product_collection_idx on product (collection) where is_active;

create trigger product_set_updated_at
    before update on product
    for each row execute function set_updated_at();

comment on column product.slug is 'URL-safe identifier, e.g. "wool-crew-classic" — never reused after a product is retired.';
comment on column product.is_active is 'Soft delete (FR-10): a retired product is hidden from the storefront but stays intact for historical orders.';

create table variant (
    id                uuid primary key default gen_random_uuid(),
    product_id        uuid not null references product (id) on delete restrict,
    sku               varchar(64) not null,
    size              varchar(32),
    color             varchar(64),
    pack_size         integer check (pack_size is null or pack_size > 0),
    price             numeric(10, 2) not null check (price >= 0),
    cost_price        numeric(10, 2) not null check (cost_price >= 0),
    margin_floor_pct  numeric(5, 2) not null check (margin_floor_pct between 0 and 100),
    stock_qty         integer not null default 0 check (stock_qty >= 0),
    reserved_qty      integer not null default 0 check (reserved_qty >= 0),
    available_qty     integer generated always as (stock_qty - reserved_qty) stored,
    is_active         boolean not null default true,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    version           integer not null default 0,
    constraint variant_sku_uq unique (sku),
    constraint variant_stock_ge_reserved_chk check (stock_qty >= reserved_qty)
);

create index variant_product_id_idx on variant (product_id);
create index variant_active_in_stock_idx on variant (product_id) where is_active and stock_qty > 0;

create trigger variant_set_updated_at
    before update on variant
    for each row execute function set_updated_at();

comment on column variant.cost_price is 'Admin-only — never returned on customer-facing endpoints.';
comment on column variant.margin_floor_pct is 'The hard limit PolicyValidator clamps against; only ADMIN can write this column (FR-11), enforced at the service layer.';
comment on column variant.reserved_qty is 'Held by open carts/pending orders; available_qty = stock_qty - reserved_qty is what the storefront shows (NFR-5 offline-cart consistency).';

-- ── Orders ───────────────────────────────────────────────────────────────
create table customer_order (
    id                       uuid primary key default gen_random_uuid(),
    customer_id              uuid not null references app_user (id) on delete restrict,
    status                   varchar(20) not null default 'PENDING'
                                 constraint customer_order_status_chk
                                 check (status in ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED')),
    payment_ref              varchar(255),
    negotiation_session_id   uuid,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    version                  integer not null default 0
);

create index customer_order_customer_id_idx on customer_order (customer_id);
create index customer_order_status_idx on customer_order (status);

create trigger customer_order_set_updated_at
    before update on customer_order
    for each row execute function set_updated_at();

comment on table customer_order is 'Named customer_order, not order — ORDER is a reserved SQL keyword.';
comment on column customer_order.payment_ref is 'Apple Pay / Google Pay token reference only — never raw card data (FR-7, NFR-4).';

create table order_item (
    id             uuid primary key default gen_random_uuid(),
    order_id       uuid not null references customer_order (id) on delete cascade,
    variant_id     uuid not null references variant (id) on delete restrict,
    quantity       integer not null check (quantity > 0),
    agreed_price   numeric(10, 2) not null check (agreed_price >= 0),
    created_at     timestamptz not null default now(),
    constraint order_item_order_variant_uq unique (order_id, variant_id)
);

create index order_item_order_id_idx on order_item (order_id);
create index order_item_variant_id_idx on order_item (variant_id);

comment on column order_item.agreed_price is 'The final, validator-checked price for this line — never the LLM''s raw proposal (FR-5).';
comment on constraint order_item_order_variant_uq on order_item is 'One line per SKU per order — repeat adds increment quantity instead of inserting a duplicate row.';

-- ── Negotiation ──────────────────────────────────────────────────────────
create table negotiation_session (
    id                       uuid primary key default gen_random_uuid(),
    customer_id              uuid not null references app_user (id) on delete restrict,
    variant_id               uuid not null references variant (id) on delete restrict,
    transcript               text,
    proposed_discount_pct    numeric(5, 2) check (proposed_discount_pct is null or proposed_discount_pct >= 0),
    validated_discount_pct   numeric(5, 2) check (validated_discount_pct is null or validated_discount_pct >= 0),
    created_at               timestamptz not null default now(),
    constraint negotiation_validated_le_proposed_chk
        check (validated_discount_pct is null or proposed_discount_pct is null
               or validated_discount_pct <= proposed_discount_pct)
);

create index negotiation_session_customer_id_idx on negotiation_session (customer_id);
create index negotiation_session_variant_id_idx on negotiation_session (variant_id);

comment on column negotiation_session.proposed_discount_pct is 'What the LLM suggested — untrusted, logged as-is (FR-6).';
comment on column negotiation_session.validated_discount_pct is 'What PolicyValidator actually allowed. The CHECK keeps the margin-safety invariant (FR-5) true in the database even if application code ever has a bug.';

-- ── Audit ────────────────────────────────────────────────────────────────
create table audit_log_entry (
    id             uuid primary key default gen_random_uuid(),
    actor_id       uuid not null references app_user (id) on delete restrict,
    action         varchar(100) not null,
    entity_type    varchar(100) not null,
    entity_id      uuid not null,
    before_state   jsonb,
    after_state    jsonb,
    correlation_id varchar(64),
    created_at     timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log_entry (entity_type, entity_id);
create index audit_log_actor_id_idx on audit_log_entry (actor_id);
create index audit_log_correlation_id_idx on audit_log_entry (correlation_id);

comment on table audit_log_entry is 'Append-only by convention — no UPDATE/DELETE grants in production (see docs/architecture.md, Security).';
comment on column audit_log_entry.before_state is 'jsonb, not text: lets admin tooling query/diff state without deserializing in application code first.';

-- ── RAG embeddings (Phase 2 — negotiation grounding) ─────────────────────
create table product_embedding (
    id           uuid primary key default gen_random_uuid(),
    variant_id   uuid not null references variant (id) on delete cascade,
    chunk_index  integer not null default 0,
    content      text not null,
    embedding    vector(1536),
    created_at   timestamptz not null default now(),
    constraint product_embedding_variant_chunk_uq unique (variant_id, chunk_index)
);

create index product_embedding_variant_id_idx on product_embedding (variant_id);

-- ivfflat needs rows to train clusters well; created empty now so Phase 2
-- doesn't need a breaking migration, and re-indexed once real embeddings
-- exist (REINDEX INDEX product_embedding_ivfflat_idx).
create index product_embedding_ivfflat_idx on product_embedding
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

comment on column product_embedding.chunk_index is 'Supports multiple embedded chunks per variant (e.g. description, policy notes) — 0-based, unique per variant.';
