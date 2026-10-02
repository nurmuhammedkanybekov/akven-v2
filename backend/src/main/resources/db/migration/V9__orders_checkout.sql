-- Checkout and order history (Milestone 2, Phase C).
--
-- Orders now keep everything a receipt needs: who to contact, how it is fulfilled, how it was paid, the total,
-- and (on each line) a snapshot of what was bought, so an order stays correct after the catalog is edited.

alter table customer_order
    add column total              numeric(12, 2) not null default 0 check (total >= 0),
    add column fulfillment_method varchar(16)    not null default 'PICKUP'
        check (fulfillment_method in ('PICKUP', 'DELIVERY')),
    add column contact_name       varchar(120),
    add column contact_phone      varchar(40),
    add column delivery_address   varchar(300),
    add column note               varchar(500),
    add column payment_method     varchar(16)
        check (payment_method is null or payment_method in ('APPLE_PAY', 'GOOGLE_PAY')),
    add column idempotency_key    varchar(64),
    add column paid_at            timestamptz,
    add column fulfilled_at       timestamptz,
    add column cancelled_at       timestamptz;

-- Delivery needs an address.
alter table customer_order add constraint customer_order_delivery_address_chk
    check (fulfillment_method <> 'DELIVERY' or delivery_address is not null);

-- FR-8 at database level: an order can only be PAID or FULFILLED if a payment reference exists.
alter table customer_order add constraint customer_order_paid_has_ref_chk
    check (status not in ('PAID', 'FULFILLED') or payment_ref is not null);

-- Pressing "pay" twice (double click, network retry) must not create two orders.
create unique index customer_order_idempotency_uq
    on customer_order (customer_id, idempotency_key) where idempotency_key is not null;

alter table order_item
    add column sku                    varchar(64)   not null default '',
    add column product_name           varchar(255)  not null default '',
    add column product_slug           varchar(160),
    add column variant_label          varchar(200),
    add column color_hex              varchar(7),
    add column image_url              varchar(500),
    add column list_price             numeric(10, 2) not null default 0 check (list_price >= 0),
    add column discount_pct           numeric(5, 2)  not null default 0 check (discount_pct between 0 and 100),
    add column negotiation_session_id uuid;

-- A negotiated offer can be used by exactly one order line. (Cancelling an order clears the link, so a declined
-- payment does not burn the customer's offer.)
create unique index order_item_negotiation_once_uq
    on order_item (negotiation_session_id) where negotiation_session_id is not null;
