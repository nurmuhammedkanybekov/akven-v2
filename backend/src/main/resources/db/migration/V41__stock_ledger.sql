-- The stock ledger: every change to a variant's stock is one row with its reason, so "why is the stock 7?" has an
-- answer. stock_after is the stock right after the change; the rows of one variant, added up, equal its stock.
create table stock_movement (
    id          uuid primary key default gen_random_uuid(),
    variant_id  uuid not null references variant (id),
    delta       integer not null,
    reason      varchar(12) not null,
    stock_after integer not null,
    order_id    uuid references customer_order (id),
    actor       varchar(255),
    note        varchar(200),
    created_at  timestamp with time zone not null default current_timestamp,
    constraint stock_movement_delta_chk check (delta <> 0),
    constraint stock_movement_after_chk check (stock_after >= 0),
    constraint stock_movement_reason_chk check (reason in ('OPENING', 'RECEIVED', 'SALE', 'CANCELLED', 'CORRECTION')),
    -- A sale or a cancellation always names its order; a delivery, a count or the opening balance never does.
    constraint stock_movement_order_chk check ((reason in ('SALE', 'CANCELLED')) = (order_id is not null))
);
create index stock_movement_variant_idx on stock_movement (variant_id, created_at desc);

-- The ledger starts from what is on the shelf today: one opening row per variant that has stock.
insert into stock_movement (variant_id, delta, reason, stock_after, note)
select id, stock_qty, 'OPENING', stock_qty, 'Stock when the ledger started'
from variant
where stock_qty > 0;
