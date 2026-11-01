-- Requests from shops, resellers and companies (the wholesale page). Until now a request only lived in a WhatsApp or
-- Telegram message, so the family had no single list of them. Now the request is kept here and shown in the admin
-- inbox; the customer can still send it to the family's messenger as well.
--
-- Anyone can write one without an account, so every text column is bounded and checked, and the API limits how many
-- requests one address can send in an hour. The contact is how the family answers: a phone (WhatsApp/call), a
-- Telegram name, or an email.
create table wholesale_request (
    id            uuid primary key default gen_random_uuid(),
    kind          varchar(10)  not null constraint wholesale_request_kind_chk check (kind in ('WHOLESALE', 'GIFTS')),
    company       varchar(80)  not null constraint wholesale_request_company_chk check (length(btrim(company)) >= 2),
    city          varchar(60),
    contact_kind  varchar(10)  not null constraint wholesale_request_contact_chk check (contact_kind in ('WHATSAPP', 'TELEGRAM', 'EMAIL', 'PHONE')),
    contact       varchar(80)  not null,
    pairs         integer      not null constraint wholesale_request_pairs_chk check (pairs between 1 and 100000),
    mix           varchar(1000),
    note          varchar(500),
    account_email varchar(255),
    status        varchar(12)  not null default 'NEW'
        constraint wholesale_request_status_chk check (status in ('NEW', 'IN_PROGRESS', 'ANSWERED', 'CLOSED')),
    staff_note    varchar(500),
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);
create index wholesale_request_inbox_idx on wholesale_request (status, created_at desc);
