-- Ak&Ven initial schema — matches the data model in docs/architecture.md
-- pgvector extension is for the negotiation module's RAG step (Phase 2); safe
-- to enable now since Milestone 1 just needs the schema, not the embeddings.
create extension if not exists vector;
create extension if not exists pgcrypto;

create table app_user (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    role varchar(20) not null,
    created_at timestamptz not null default now()
);

create table product (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    collection varchar(255),
    description varchar(2000),
    fabric_composition varchar(255)
);

create table variant (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references product(id),
    sku varchar(64) not null unique,
    size varchar(32),
    color varchar(64),
    pack_size integer,
    price numeric(10,2) not null,
    cost_price numeric(10,2) not null,
    margin_floor_pct numeric(5,2) not null,
    stock_qty integer not null default 0
);

create table customer_order (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references app_user(id),
    status varchar(20) not null default 'PENDING',
    payment_ref varchar(255),
    negotiation_session_id uuid,
    created_at timestamptz not null default now()
);

create table order_item (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references customer_order(id),
    variant_id uuid not null references variant(id),
    quantity integer not null,
    agreed_price numeric(10,2) not null
);

create table negotiation_session (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references app_user(id),
    variant_id uuid not null references variant(id),
    transcript text,
    proposed_discount_pct numeric(5,2),
    validated_discount_pct numeric(5,2),
    created_at timestamptz not null default now()
);

create table audit_log_entry (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null,
    action varchar(100) not null,
    entity_type varchar(100) not null,
    entity_id uuid not null,
    before_state text,
    after_state text,
    correlation_id varchar(64),
    created_at timestamptz not null default now()
);

-- RAG embeddings over product/policy text — Phase 2, table exists now so the
-- schema doesn't need a breaking migration later.
create table product_embedding (
    id uuid primary key default gen_random_uuid(),
    variant_id uuid not null references variant(id),
    content text not null,
    embedding vector(1536)
);
