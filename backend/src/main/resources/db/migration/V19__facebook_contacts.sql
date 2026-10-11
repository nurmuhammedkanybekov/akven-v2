-- Facebook joins the ways customers can reach the shop.
alter table shop_contact drop constraint if exists shop_contact_kind_check;
alter table shop_contact add constraint shop_contact_kind_check
    check (kind in ('INSTAGRAM', 'TELEGRAM', 'WHATSAPP', 'PHONE', 'EMAIL', 'FACEBOOK'));
