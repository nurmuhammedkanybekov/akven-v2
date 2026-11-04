-- Guest checkout: an order without an account. The customer gives an email (for the confirmation and the private
-- link to the order) and a phone, as before. Exactly one of the two is set: the account, or the guest's email.
-- The link's token is never stored: it is a keyed hash of the order id (see OrderLinks), so a lost link can be sent
-- again and nothing in the database can be stolen to open someone's order.
alter table customer_order alter column customer_id drop not null;
alter table customer_order add column guest_email varchar(255);
alter table customer_order add constraint customer_order_owner_chk
    check ((customer_id is not null and guest_email is null) or (customer_id is null and guest_email is not null));

-- A guest's double click or network retry finds its first order again (accounts have their own index, from V9).
create unique index customer_order_guest_idempotency_uq
    on customer_order (idempotency_key) where customer_id is null and idempotency_key is not null;
-- Kept in lower case, so finding a lost link by email is a plain lookup.
create index customer_order_guest_email_idx on customer_order (guest_email) where guest_email is not null;

-- A guest's order and its cancellation are audited too, without an account: the actor is empty and shows as "guest".
alter table audit_log_entry alter column actor_id drop not null;

-- The email with the private link to an order, sent again when a customer lost it.
alter table outbound_email drop constraint outbound_email_kind_chk;
alter table outbound_email add constraint outbound_email_kind_chk
    check (kind in ('ORDER_CONFIRMED', 'ORDER_HANDED_OVER', 'ORDER_CANCELLED', 'WHOLESALE_RECEIVED', 'ORDER_LINK'));
