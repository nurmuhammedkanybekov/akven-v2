-- Product images: several per product, ordered, each with alt text (accessibility is a requirement,
-- not a nicety). Only the URL is stored; the files themselves live with the frontend or a CDN.
create table product_image (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references product (id) on delete cascade,
    url         varchar(500) not null,
    alt         varchar(255) not null,
    position    integer not null check (position >= 0),
    created_at  timestamptz not null default now(),
    constraint product_image_position_uq unique (product_id, position)
);

create index product_image_product_idx on product_image (product_id, position);
