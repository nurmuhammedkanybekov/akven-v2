-- Stock status, cases and delivery countries (Milestone 3, Phase 1c).

-- What is on the way, when it arrives, and how many pairs make one case (often 200 or 250, for example 20 packs of 12).
alter table variant
    add column incoming_qty integer not null default 0 check (incoming_qty >= 0),
    add column restock_eta  date,
    add column case_pairs   integer check (case_pairs is null or case_pairs between 1 and 100000);

comment on column variant.incoming_qty is 'Units on the way from the factory. With restock_eta it lets the shop say "arrives in about N days".';
comment on column variant.case_pairs is 'Pairs in one wholesale case. Customers may still mix colours inside a case.';

-- "Only N left" below this many units.
alter table shop_policy
    add column few_left_threshold integer not null default 5 check (few_left_threshold between 0 and 10000);

-- Where a delivery goes. Most customers are in Kyrgyzstan, Kazakhstan, Uzbekistan and Russia.
alter table customer_order
    add column delivery_country varchar(2) check (delivery_country is null or delivery_country in ('KG', 'KZ', 'UZ', 'RU'));

-- Deliveries placed before countries existed were all within Kyrgyzstan.
update customer_order set delivery_country = 'KG' where fulfillment_method = 'DELIVERY';

alter table customer_order add constraint customer_order_delivery_country_chk
    check (fulfillment_method <> 'DELIVERY' or delivery_country is not null);
