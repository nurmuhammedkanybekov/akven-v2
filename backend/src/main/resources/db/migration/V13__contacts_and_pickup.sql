-- Contacts, the Dordoi pickup point and pickup codes (Milestone 3, Phase 1b).
--
-- Contacts and the stall are entered by the owners in the admin panel. Phone numbers are never part of a migration.

-- ── Contacts ─────────────────────────────────────────────────────────────
create table shop_contact (
    id          uuid primary key default gen_random_uuid(),
    kind        varchar(16)  not null check (kind in ('INSTAGRAM', 'TELEGRAM', 'WHATSAPP', 'PHONE', 'EMAIL')),
    label       varchar(80),
    contact_value varchar(120) not null,
    position    integer      not null default 0,
    is_active   boolean      not null default true,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now(),
    version     integer      not null default 0
);

create trigger shop_contact_set_updated_at
    before update on shop_contact
    for each row execute function set_updated_at();

comment on column shop_contact.contact_value is 'A handle (Instagram, Telegram), a phone number in international form (WhatsApp, phone) or an email address. Links are built by the server.';

-- ── Pickup points ────────────────────────────────────────────────────────
create table pickup_point (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(120)  not null,
    market      varchar(120)  not null,
    section     varchar(120),
    passage     varchar(40),
    container   varchar(40)   not null,
    city        varchar(80)   not null default 'Bishkek',
    hours       varchar(200),
    directions  varchar(1000),
    position    integer       not null default 0,
    is_active   boolean       not null default true,
    created_at  timestamptz   not null default now(),
    updated_at  timestamptz   not null default now(),
    version     integer       not null default 0
);

create trigger pickup_point_set_updated_at
    before update on pickup_point
    for each row execute function set_updated_at();

comment on table pickup_point is 'Where customers collect orders. Values are language-neutral (passage 8, container 70-E); the shop translates the labels.';

-- ── Pickup codes on orders ───────────────────────────────────────────────
alter table customer_order
    add column pickup_point_id uuid references pickup_point (id) on delete restrict,
    add column pickup_code     varchar(6) check (pickup_code is null or pickup_code ~ '^[0-9]{6}$');

-- Two open orders never share a code, so the code alone finds the order at the stall.
create unique index customer_order_open_pickup_code_uq
    on customer_order (pickup_code) where status = 'PAID' and pickup_code is not null;

comment on column customer_order.pickup_code is 'Six digits the customer shows at the stall. Handing over also needs the last digits of the contact phone.';
