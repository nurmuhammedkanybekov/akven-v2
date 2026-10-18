-- Demo: the shop's email address, after Instagram and Telegram. On a real installation it comes from SHOP_CONTACTS.
insert into shop_contact (kind, label, contact_value, position)
select 'EMAIL', 'Email', 'akven.socks@gmail.com', coalesce(max(position), -1) + 1 from shop_contact
 where not exists (select 1 from shop_contact where kind = 'EMAIL' and contact_value = 'akven.socks@gmail.com');
