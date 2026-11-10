-- Reserve now, pay when you collect (or when the courier comes). Such an order is RESERVED: its pairs are held for a
-- while (reserved_until) and nothing is charged online; the team takes the money at handover, and only then is the
-- order sold (FULFILLED). An unpaid reservation expires and its pairs go back on the shelf.
alter table customer_order drop constraint customer_order_status_chk;
alter table customer_order add constraint customer_order_status_chk
    check (status in ('PENDING', 'RESERVED', 'PAID', 'FULFILLED', 'CANCELLED'));

alter table customer_order add column pay_on_handover boolean not null default false;
alter table customer_order add column reserved_until timestamp with time zone;
alter table customer_order add constraint customer_order_reserved_chk
    check (status <> 'RESERVED' or (pay_on_handover and reserved_until is not null));

-- A reserved pickup order also waits at the stall with its code, so codes must be unique among both.
drop index customer_order_open_pickup_code_uq;
create unique index customer_order_open_pickup_code_uq
    on customer_order (pickup_code) where status in ('PAID', 'RESERVED') and pickup_code is not null;
create index customer_order_reserved_until_idx on customer_order (reserved_until) where status = 'RESERVED';
