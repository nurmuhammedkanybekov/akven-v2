-- Collection pricing (Milestone 3, Phase 1a).
--
-- Socks are sold as collections: customers may mix any socks, the order has a minimum number of PAIRS (not lines),
-- and the price per pair drops in steps as the collection grows. All of these numbers belong to the owners and are
-- changed in the admin panel; nothing here is decided by the client or by the assistant.

-- ── Shop policy: exactly one row ─────────────────────────────────────────
create table shop_policy (
    id                       smallint primary key default 1
                                 constraint shop_policy_single_row_chk check (id = 1),
    min_order_pairs          integer not null default 1 check (min_order_pairs between 1 and 10000),
    trusted_min_order_pairs  integer not null default 1 check (trusted_min_order_pairs between 1 and 10000),
    trusted_after_orders     integer not null default 3 check (trusted_after_orders between 1 and 1000),
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    version                  integer not null default 0,
    constraint shop_policy_trusted_min_chk check (trusted_min_order_pairs <= min_order_pairs)
);

create trigger shop_policy_set_updated_at
    before update on shop_policy
    for each row execute function set_updated_at();

-- Starts with no minimum, so the current storefront keeps working; the owners raise it (to 10) in the admin panel.
insert into shop_policy (id) values (1);

comment on table shop_policy is 'Order rules set by the owners. One row only (id = 1).';
comment on column shop_policy.min_order_pairs is 'Fewest pairs one order may contain, counted across all lines (mixing socks is allowed).';
comment on column shop_policy.trusted_min_order_pairs is 'Lower minimum for trusted customers: marked by an owner, or with enough paid orders.';
comment on column shop_policy.trusted_after_orders is 'Paid orders after which a customer counts as trusted automatically.';

-- ── Price tiers: the ladder ──────────────────────────────────────────────
create table price_tier (
    id            uuid primary key default gen_random_uuid(),
    min_pairs     integer not null check (min_pairs between 1 and 100000),
    discount_pct  numeric(5, 2) not null check (discount_pct between 0 and 90),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    version       integer not null default 0,
    constraint price_tier_min_pairs_uq unique (min_pairs)
);

create trigger price_tier_set_updated_at
    before update on price_tier
    for each row execute function set_updated_at();

comment on table price_tier is 'Collection discount: an order with at least min_pairs pairs gets discount_pct off every line, never more than each sock''s own limit.';

-- ── Trusted customers ────────────────────────────────────────────────────
alter table app_user add column trusted boolean not null default false;

comment on column app_user.trusted is 'Set by an owner: this customer may order from the lower trusted minimum.';

-- ── Why each line costs what it costs ────────────────────────────────────
alter table order_item
    add column tier_discount_pct numeric(5, 2) not null default 0 check (tier_discount_pct between 0 and 90),
    add column discount_source   varchar(16)   not null default 'NONE'
        check (discount_source in ('NONE', 'TIER', 'NEGOTIATED')),
    add column discount_capped   boolean       not null default false;

comment on column order_item.discount_source is 'Which rule gave this line its discount: none, the collection tier, or a negotiated offer.';
comment on column order_item.discount_capped is 'True when the sock''s own limit (margin floor) cut the discount down.';
