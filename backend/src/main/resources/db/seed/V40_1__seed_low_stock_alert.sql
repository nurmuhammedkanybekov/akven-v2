-- Demo: one low-stock alert to the owners, as the shop writes it when a paid order takes a sock to the "few left"
-- level (Notifier.lowStock). It is about a sock that really is low in the demo stock and the latest paid order.
-- Demo mode has no mail server, so it was kept, not sent, like the customers' emails.
insert into outbound_email (kind, to_address, lang, subject, body, order_id, status, last_error, created_at, next_attempt_at)
select 'LOW_STOCK', u.email, 'en',
       'Running low after order ' || o.reference,
       'Order ' || o.reference || ' has just been paid, and these socks are now at ' || sp.few_left_threshold || E' pairs or fewer:\n\n'
           || '  • ' || p.name || ' (' || v.color || ', ' || v.size || '), ' || v.sku || ': ' || (v.stock_qty - v.reserved_qty) || ' left'
           || case when v.incoming_qty > 0 then ', ' || v.incoming_qty || ' on the way' else '' end
           || E'\n\nStock and what is on the way: http://localhost:8081/admin/dashboard\n\nAK&VEN · container 70-E, Dordoi Bazaar, Bishkek',
       null, 'NOT_SENT', 'No mail server is set up (MAIL_HOST), so the email was kept here and not sent.',
       o.paid_at + interval '42 seconds', o.paid_at
from shop_policy sp
cross join lateral (select v.* from variant v join product p2 on p2.id = v.product_id and p2.is_active
                    where v.is_active and v.stock_qty - v.reserved_qty between 1 and sp.few_left_threshold
                    order by v.sku limit 1) v
join product p on p.id = v.product_id
cross join lateral (select 'AV-' || upper(left(id::text, 8)) as reference, paid_at from customer_order where paid_at is not null order by paid_at desc limit 1) o
join app_user u on u.role in ('ADMIN', 'SUPER_ADMIN') and u.is_active;
