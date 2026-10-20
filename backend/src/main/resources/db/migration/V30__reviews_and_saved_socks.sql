-- Reviews from verified buyers, and saved socks kept in the account (Milestone 3, the "level up" round).
--
-- A customer can review a sock only after an order with it was handed over (checked by the API), once per product;
-- writing again replaces the review and sends it back for approval. Nothing is shown until the owners approve it.
create table product_review (
    id           uuid primary key default gen_random_uuid(),
    product_id   uuid         not null references product (id) on delete cascade,
    user_id      uuid         not null references app_user (id) on delete cascade,
    rating       smallint     not null constraint product_review_rating_chk check (rating between 1 and 5),
    author       varchar(40),
    body         varchar(1000) not null constraint product_review_body_chk check (length(btrim(body)) >= 10),
    status       varchar(10)  not null default 'PENDING'
        constraint product_review_status_chk check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at   timestamptz  not null default now(),
    moderated_at timestamptz,
    constraint product_review_once unique (product_id, user_id)
);
create index product_review_shown_idx on product_review (product_id, created_at desc) where status = 'APPROVED';
create index product_review_waiting_idx on product_review (created_at) where status = 'PENDING';

-- The heart, kept with the account so it follows the customer from phone to laptop. Visitors keep theirs in the browser.
create table saved_item (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid        not null references app_user (id) on delete cascade,
    product_id uuid        not null references product (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint saved_item_once unique (user_id, product_id)
);
create index saved_item_product_idx on saved_item (product_id);
