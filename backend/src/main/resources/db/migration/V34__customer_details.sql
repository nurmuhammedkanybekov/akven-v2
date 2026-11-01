-- What a customer chose to keep for the next order: who to contact, the phone, and where to deliver. Kept only when
-- the customer ticks "remember my details" at checkout or saves them in the account, and deleted with one tap there.
-- One row per account; it goes when the account goes. The delivery area may be removed later: then it is forgotten.
create table customer_details (
    user_id       uuid primary key references app_user (id) on delete cascade,
    contact_name  varchar(120),
    contact_phone varchar(40),
    address       varchar(300),
    country       varchar(2) constraint customer_details_country_chk check (country is null or country in ('KG', 'KZ', 'UZ', 'RU')),
    zone_id       uuid references delivery_zone (id) on delete set null,
    updated_at    timestamptz not null default now()
);
