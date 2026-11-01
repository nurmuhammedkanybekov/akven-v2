-- Delivery zones: where the shop delivers, for how much, and how long it takes. The owners edit them in the admin.
--
-- Until now delivery had no price and no time, so the customer learned both only on the phone. A zone belongs to one
-- country (the shop sends to KG, KZ, UZ and RU); its fee is in US dollars like every price, and an order whose socks
-- cost free_from or more travels free. Days are a range ("2-4 days") because the family cannot promise an hour.
--
-- The order keeps a copy of the zone's name, fee and days as they were when it was paid, so editing or removing a
-- zone later never changes an old receipt.
create table delivery_zone (
    id         uuid primary key default gen_random_uuid(),
    country    varchar(2)    not null constraint delivery_zone_country_chk check (country in ('KG', 'KZ', 'UZ', 'RU')),
    name       varchar(60)   not null constraint delivery_zone_name_chk check (length(btrim(name)) >= 2),
    fee        numeric(12, 2) not null default 0 constraint delivery_zone_fee_chk check (fee >= 0 and fee <= 1000),
    free_from  numeric(12, 2) constraint delivery_zone_free_chk check (free_from is null or free_from > 0),
    days_min   integer constraint delivery_zone_days_chk check (days_min is null or days_min between 0 and 60),
    days_max   integer,
    active     boolean       not null default true,
    position   integer       not null default 0,
    constraint delivery_zone_days_order_chk check (days_max is null or (days_min is not null and days_max between days_min and 60))
);
create index delivery_zone_country_idx on delivery_zone (country, position);

-- One zone per country to start with, free and without a promised time: exactly how delivery worked before, until
-- the owners enter their real prices.
insert into delivery_zone (country, name, position) values
    ('KG', 'Kyrgyzstan', 10), ('KZ', 'Kazakhstan', 20), ('UZ', 'Uzbekistan', 30), ('RU', 'Russia', 40);

alter table customer_order
    add column delivery_zone_id   uuid references delivery_zone (id) on delete set null,
    add column delivery_zone_name varchar(60),
    add column delivery_fee       numeric(12, 2) not null default 0 constraint customer_order_delivery_fee_chk check (delivery_fee >= 0),
    add column delivery_days_min  integer,
    add column delivery_days_max  integer;
