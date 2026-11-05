-- The owners' email when a sale leaves a sock at or below the "few left" level.
alter table outbound_email drop constraint outbound_email_kind_chk;
alter table outbound_email add constraint outbound_email_kind_chk
    check (kind in ('ORDER_CONFIRMED', 'ORDER_HANDED_OVER', 'ORDER_CANCELLED', 'WHOLESALE_RECEIVED', 'ORDER_LINK', 'LOW_STOCK'));
