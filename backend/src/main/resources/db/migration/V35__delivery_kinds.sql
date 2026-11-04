-- How each delivery area works, the way the family delivers:
--   COURIER: in Bishkek and around it the family sends the parcel with a courier (a Yandex taxi), and a large order
--            goes with the family's own car (the area's "free from" amount);
--   CARGO:   to the regions and abroad the parcel goes with a cargo carrier the customer chooses; the family takes it
--            to the carrier at Dordoi, and the customer pays the carrier when they collect it (pay_on_receipt).
-- note: what the customer should know about the area, shown at checkout and kept on the order.
alter table delivery_zone
    add column kind           varchar(10)  not null default 'COURIER' constraint delivery_zone_kind_chk check (kind in ('COURIER', 'CARGO')),
    add column pay_on_receipt boolean      not null default false,
    add column note           varchar(300);

-- The order keeps its own copy, so a later change to the area never changes what the customer was told.
alter table customer_order
    add column delivery_kind           varchar(10) constraint customer_order_delivery_kind_chk check (delivery_kind is null or delivery_kind in ('COURIER', 'CARGO')),
    add column delivery_pay_on_receipt boolean     not null default false;
