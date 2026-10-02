-- An offer is negotiated for a number of pairs (a bigger order earns a better price), so it must remember that
-- number: otherwise a customer could haggle for 10 pairs and then buy one at the 10-pair price.
alter table negotiation_session
    add column quantity integer not null default 1 check (quantity >= 1);
