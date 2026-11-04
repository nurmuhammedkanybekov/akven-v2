-- Emails to customers: the order confirmation, "handed over / on its way / with the carrier", a cancellation, and
-- "we got your wholesale request". An email is written here in the same transaction as the change it reports (an
-- outbox), so a change that rolls back sends nothing, and a mail server that is down loses nothing: the sender tries
-- again later. Without a mail server (demo mode, a laptop) nothing leaves the shop and the email stays readable in
-- the admin. Rows are deleted after akven.mail.keep-days (90 by default): they hold names and addresses.
create table outbound_email (
    id              uuid primary key default gen_random_uuid(),
    kind            varchar(24)  not null constraint outbound_email_kind_chk
        check (kind in ('ORDER_CONFIRMED', 'ORDER_HANDED_OVER', 'ORDER_CANCELLED', 'WHOLESALE_RECEIVED')),
    to_address      varchar(255) not null,
    lang            varchar(2)   not null default 'en' constraint outbound_email_lang_chk check (lang in ('en', 'ru', 'ky')),
    subject         varchar(200) not null,
    body            text         not null,
    order_id        uuid,
    status          varchar(10)  not null default 'QUEUED'
        constraint outbound_email_status_chk check (status in ('QUEUED', 'SENT', 'FAILED', 'NOT_SENT')),
    attempts        integer      not null default 0,
    last_error      varchar(300),
    next_attempt_at timestamptz  not null default now(),
    created_at      timestamptz  not null default now(),
    sent_at         timestamptz
);
create index outbound_email_queue_idx on outbound_email (status, next_attempt_at);
create index outbound_email_order_idx on outbound_email (order_id);
create index outbound_email_created_idx on outbound_email (created_at desc);

-- The language the customer was using at checkout, so the emails about the order speak it too.
alter table customer_order
    add column lang varchar(2) not null default 'en' constraint customer_order_lang_chk check (lang in ('en', 'ru', 'ky'));
