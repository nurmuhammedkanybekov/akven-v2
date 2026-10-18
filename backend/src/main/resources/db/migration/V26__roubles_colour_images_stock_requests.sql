-- Roubles, pictures per colour, and "tell me when it is back" (Milestone 3, final round).
--
-- Russian roubles join som: the owners set how many roubles a dollar is and how rouble prices are rounded, so
-- customers from Russia can read every price in roubles. Prices are still kept and charged in dollars.
alter table shop_policy add column rub_per_usd numeric(10, 2) not null default 82.00
    constraint shop_policy_rub_rate_chk check (rub_per_usd > 0);
alter table shop_policy add column rub_rounding integer not null default 10
    constraint shop_policy_rub_rounding_chk check (rub_rounding in (1, 5, 10, 50, 100));

-- A picture can belong to one colour of a product: choosing that colour on the product page or in quick view shows
-- its pictures. Pictures without a colour belong to the product as a whole (the card's cover, for instance).
alter table product_image add column color varchar(60);
create index product_image_product_color_idx on product_image (product_id, color);

-- A customer asks to be told when a sold-out option is back. The owners see who is waiting for what and write to
-- them in the messenger they left; nothing is sent automatically.
create table stock_request (
    id          uuid primary key default gen_random_uuid(),
    variant_id  uuid        not null references variant (id) on delete cascade,
    user_id     uuid        not null references app_user (id) on delete cascade,
    created_at  timestamptz not null default now(),
    notified_at timestamptz,
    constraint stock_request_once unique (variant_id, user_id)
);
create index stock_request_open_idx on stock_request (variant_id) where notified_at is null;
