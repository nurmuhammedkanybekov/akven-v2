-- Demo mode only: three months of a living shop, so every screen of the admin has something true-looking to show at
-- the defence. Imaginary customers (Bishkek, Osh, Almaty, Tashkent, Moscow; Kyrgyz, Russian, Uzbek, Kazakh and
-- Koryo-saram names), their orders in every state and every way of delivery, guests, gift boxes, price conversations
-- with the assistant (some held to the limit), reviews, wholesale requests, people waiting for sold-out socks, the
-- emails the shop wrote, and the team's changes in the audit log. Dates are relative to the day this runs.
--
-- Nobody can sign in as these customers (each has a random password nobody knows), except aida@akven.test /
-- changeme-customer, a demo account like the team's: switched off when a super admin is set. Every phone number is the
-- shop's placeholder, never a real one. Stock is left as it is: this is history, not a change to the shelves.
do $$
declare
    names text[] := array[
        'Aizada Toktogulova', 'Bakyt Asanov', 'Nurlan Sadykov', 'Aigerim Bekova', 'Timur Ibraimov', 'Elnura Mamytova',
        'Kanat Osmonov', 'Gulnara Abdyldaeva', 'Ermek Jumabaev', 'Dinara Usenova', 'Azamat Kadyrov', 'Meerim Sultanbekova',
        'Elena Pak', 'Viktor Tsoi', 'Min-ji Kim', 'Saltanat Nurlanova', 'Dilnoza Rakhimova', 'Olga Petrova',
        'Sergey Ivanov', 'Chynara Alieva', 'Begimai Toktosunova', 'Ulan Bekmuratov', 'Jyldyz Omurova', 'Asel Karimova'];
    langs text[] := array['ky','ru','ru','ky','ru','ky','ky','ru','ky','ru','ru','ky','ru','ru','en','ru','ru','ru','ru','ky','ky','ru','ky','en'];
    bishkek text[] := array['Chui avenue 120, apartment 14', 'Toktogul street 98, apartment 3', 'Manas avenue 40, office 205',
        'Jibek Jolu avenue 455', 'Ahunbaev street 77, apartment 51', 'Dzhal microdistrict 15, house 8', 'Asanbai 22, apartment 40',
        'Kievskaya street 104, apartment 9'];
    cargo_addr text[] := array['Osh, Lenin street 5, collect at the bus station cargo office', 'Karakol, Toktogul street 12, Asel',
        'Almaty, Abai avenue 50, collect at the cargo terminal', 'Tashkent, Chilanzar 7, collect at the cargo office',
        'Moscow, Lyublino market, collect at the cargo office'];
    gifts text[] := array['Happy birthday, Apa! Warm feet all winter.', 'С 8 Марта, мама! Пусть всегда будет тепло.',
        'Туулган күнүң менен, досум!', 'For the best grandfather in Naryn.'];
    users uuid[] := '{}';
    u uuid; aida uuid; staff uuid; owner uuid; super uuid;
    o uuid; v record; z delivery_zone%rowtype; pt uuid; s uuid;
    i int; k int; n int; qty int; items int; who int;
    created timestamptz; st text; method text; tot numeric; dfee numeric; tier numeric; price numeric;
    seq int := 0; guest text; lg text; ref text; nm text; pay text;
begin
    perform setseed(0.38);
    select id into staff from app_user where email = 'staff@akven.test';
    select id into owner from app_user where email = 'admin@akven.test';
    select id into super from app_user where email = 'superadmin@akven.test';
    select id into pt from pickup_point order by position limit 1;

    -- customers, joined over the last four months; a few the owners marked as trusted
    insert into app_user (email, password_hash, role, display_name, created_at, updated_at, trusted)
    values ('aida@akven.test', crypt('changeme-customer', gen_salt('bf')), 'CUSTOMER', 'Aida Demo', now() - interval '120 days', now(), true)
    on conflict (lower(email)) do nothing;
    select id into aida from app_user where email = 'aida@akven.test';
    for i in 1 .. array_length(names, 1) loop
        insert into app_user (email, password_hash, role, display_name, created_at, updated_at, trusted)
        values (lower(replace(split_part(names[i], ' ', 1), '-', '')) || '.' || lower(left(split_part(names[i], ' ', 2), 1)) || i || '@example.com',
                crypt(gen_random_uuid()::text, gen_salt('bf', 4)), 'CUSTOMER', names[i],
                now() - (random() * 120 + 5) * interval '1 day', now(), i in (3, 9, 17))
        on conflict (lower(email)) do nothing
        returning id into u;
        if u is not null then users := users || u; end if;
    end loop;
    users := users || aida || aida || aida;   -- the demo customer orders more often than the others

    -- about 150 orders over ninety days, more of them recent
    for n in 1 .. 150 loop
        created := now() - (power(random(), 1.6) * 90) * interval '1 day' - random() * interval '10 hours';
        who := 1 + floor(random() * array_length(users, 1))::int;
        guest := null;
        if random() < 0.14 then
            guest := 'guest' || n || '@example.com';
        end if;
        lg := case when who <= array_length(langs, 1) then langs[who] else 'en' end;
        nm := case when who <= array_length(names, 1) then names[who] else 'Aida Demo' end;
        if guest is not null then nm := (array['Nazgul', 'Rustam', 'Kairat', 'Svetlana', 'Joon-ho'])[1 + n % 5] || ' ' || (array['K.', 'M.', 'T.', 'S.', 'L.'])[1 + n % 5]; end if;

        -- how it travels: pickup at the stall, the Bishkek courier, or a cargo carrier
        k := floor(random() * 100)::int;
        method := case when k < 55 then 'PICKUP' else 'DELIVERY' end;
        z := null::delivery_zone;
        if method = 'DELIVERY' then
            select * into z from delivery_zone where active and kind = (case when k < 85 then 'COURIER' else 'CARGO' end)
            order by random() limit 1;
            if z.id is null then method := 'PICKUP'; end if;
        end if;

        -- what happened to it: older orders are mostly handed over, new ones wait; some were cancelled
        k := floor(random() * 100)::int;
        st := case
            when k < 6 then 'CANCELLED'
            when created > now() - interval '3 days' then 'PAID'
            when created > now() - interval '9 days' and k < 45 then 'PAID'
            else 'FULFILLED' end;
        pay := case when random() < 0.55 then 'APPLE_PAY' else 'GOOGLE_PAY' end;

        o := gen_random_uuid();
        insert into customer_order (id, customer_id, guest_email, status, created_at, updated_at, fulfillment_method, contact_name,
                contact_phone, delivery_address, payment_method, payment_ref, paid_at, pickup_point_id, delivery_country, lang, idempotency_key)
        values (o, case when guest is null then users[who] end, guest, 'PENDING', created, created, method, nm, '+996 700 123 456',
                case when method = 'DELIVERY' then case when z.kind = 'CARGO' then cargo_addr[1 + floor(random() * 5)::int] else 'Bishkek, ' || bishkek[1 + floor(random() * 8)::int] end end,
                pay, 'sim_pay_' || gen_random_uuid(), created + interval '40 seconds',
                case when method = 'PICKUP' then pt end, case when method = 'DELIVERY' then z.country end, lg, 'demo-' || n || '-' || left(gen_random_uuid()::text, 8));

        -- one to four socks; now and then a family or a small shop buys by the dozen and reaches a price step
        items := 1 + floor(power(random(), 2) * 4)::int;
        tot := 0;
        tier := 0;
        qty := 0;
        for v in select va.*, p.name as pname, p.slug as pslug,
                        (select url from product_image im where im.product_id = p.id order by position limit 1) as img
                 from variant va join product p on p.id = va.product_id
                 where va.is_active and p.is_active and va.price > 0
                 order by random() limit items loop
            k := case when random() < 0.1 then 6 + floor(random() * 30)::int else 1 + floor(random() * 4)::int end;
            qty := qty + k;
            insert into order_item (order_id, variant_id, quantity, agreed_price, list_price, discount_pct, tier_discount_pct, discount_source,
                    sku, product_name, product_slug, variant_label, color_hex, image_url, created_at)
            values (o, v.id, k, v.price, v.price, 0, 0, 'NONE', v.sku, v.pname, v.pslug,
                    concat_ws(', ', v.color, v.size), v.color_hex, v.img, created);
        end loop;
        -- the price ladder, as the shop applies it: every pair counts towards the step
        select coalesce(max(discount_pct), 0) into tier from price_tier where min_pairs <= qty;
        if tier > 0 then
            update order_item set tier_discount_pct = tier, discount_pct = tier, discount_source = 'TIER',
                agreed_price = round(list_price * (100 - tier) / 100, 2) where order_id = o;
        end if;
        select coalesce(sum(agreed_price * quantity), 0) into tot from order_item where order_id = o;

        dfee := 0;
        if method = 'DELIVERY' then
            dfee := case when z.free_from is not null and tot >= z.free_from then 0 else z.fee end;
            update customer_order set delivery_zone_id = z.id, delivery_zone_name = z.name, delivery_fee = dfee, delivery_days_min = z.days_min,
                delivery_days_max = z.days_max, delivery_kind = z.kind, delivery_pay_on_receipt = z.pay_on_receipt where id = o;
        end if;
        if random() < 0.08 then
            update customer_order set gift_box = (array['KRAFT','NAVY','RED'])[1 + floor(random() * 3)::int],
                gift_ribbon = (array['GOLD','RED','WHITE'])[1 + floor(random() * 3)::int], gift_to = (array['Apa','Mama','Ata','Aijan'])[1 + n % 4],
                gift_message = gifts[1 + n % 4], gift_hide_prices = true where id = o;
        end if;
        seq := seq + 1;
        update customer_order set total = tot + dfee, status = st,
            pickup_code = case when method = 'PICKUP' then lpad((100000 + (seq * 7919) % 899999)::text, 6, '0') end,
            fulfilled_at = case when st = 'FULFILLED' then created + (6 + random() * 70) * interval '1 hour' end,
            cancelled_at = case when st = 'CANCELLED' then created + (1 + random() * 20) * interval '1 hour' end,
            updated_at = created + interval '1 hour'
        where id = o;

        -- what the audit log saw: placed and paid by the customer, then handed over or cancelled by the team
        ref := 'AV-' || upper(left(o::text, 8));
        insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at) values
            (case when guest is null then users[who] end, 'ORDER_PLACED', 'ORDER', o, null, jsonb_build_object('reference', ref, 'status', 'PENDING'), 'demo', created),
            (case when guest is null then users[who] end, 'ORDER_PAID', 'ORDER', o, '{"status":"PENDING"}', jsonb_build_object('reference', ref, 'status', 'PAID', 'total', tot + dfee), 'demo', created + interval '40 seconds');
        if st = 'FULFILLED' then
            insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
            select case when random() < 0.6 then staff else owner end, case when method = 'PICKUP' then 'ORDER_HANDED_OVER' else 'ORDER_FULFILLED' end,
                   'ORDER', o, '{"status":"PAID"}'::jsonb, jsonb_build_object('reference', ref, 'status', 'FULFILLED'), 'demo', fulfilled_at
            from customer_order where id = o;
        elsif st = 'CANCELLED' then
            insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
            select case when random() < 0.5 and guest is null then users[who] else owner end, 'ORDER_CANCELLED', 'ORDER', o, '{"status":"PAID"}'::jsonb,
                   jsonb_build_object('reference', ref, 'status', 'CANCELLED', 'refunded', tot + dfee), 'demo', cancelled_at
            from customer_order where id = o;
        end if;

        -- the emails the shop wrote about it (demo mode has no mail server, so they were kept, not sent)
        insert into outbound_email (kind, to_address, lang, subject, body, order_id, status, last_error, created_at, next_attempt_at)
        select 'ORDER_CONFIRMED', coalesce(guest, (select email from app_user where id = users[who])), lg,
               case lg when 'ru' then 'Заказ ' || ref || ' подтверждён – AK&VEN' when 'ky' then ref || ' буйрутмасы ырасталды – AK&VEN' else 'Order ' || ref || ' is confirmed – AK&VEN' end,
               case lg when 'ru' then 'Здравствуйте, ' || nm || E'!\n\nСпасибо! Ваш заказ ' || ref || E' принят и оплачен.\nИтого оплачено: $' || (tot + dfee) || E'\nЭто была демо-оплата: настоящие деньги не списывались.\n\nAK&VEN · контейнер 70-E, рынок Дордой, Бишкек'
                         when 'ky' then 'Саламатсызбы, ' || nm || E'!\n\nРахмат! ' || ref || E' буйрутмаңыз кабыл алынды жана төлөндү.\nБардыгы төлөндү: $' || (tot + dfee) || E'\nБул демо-төлөм болчу: чыныгы акча алынган жок.\n\nAK&VEN · 70-E контейнер, Дордой базары, Бишкек'
                         else 'Hello ' || nm || E',\n\nThank you! We have your order ' || ref || E', and it is paid.\nTotal paid: $' || (tot + dfee) || E'\nThis was a demo payment: no real money was taken.\n\nAK&VEN · container 70-E, Dordoi Bazaar, Bishkek' end,
               o, 'NOT_SENT', 'No mail server is set up (MAIL_HOST), so the email was kept here and not sent.', created + interval '41 seconds', created;
        if st in ('FULFILLED', 'CANCELLED') then
            insert into outbound_email (kind, to_address, lang, subject, body, order_id, status, last_error, created_at, next_attempt_at)
            select case when st = 'FULFILLED' then 'ORDER_HANDED_OVER' else 'ORDER_CANCELLED' end,
                   coalesce(guest, (select email from app_user where id = users[who])), lg,
                   case when st = 'FULFILLED' then case when method = 'PICKUP' then 'Order ' || ref || ' is collected – thank you!' else 'Order ' || ref || ' is on its way' end
                        else 'Order ' || ref || ' is cancelled' end,
                   'Hello ' || nm || E',\n\n' || case when st = 'FULFILLED' then 'Order ' || ref || ' has been handed over. Thank you, and enjoy your socks!'
                        else 'Order ' || ref || ' was cancelled and the demo payment returned.' end || E'\n\nAK&VEN · container 70-E, Dordoi Bazaar, Bishkek',
                   o, 'NOT_SENT', 'No mail server is set up (MAIL_HOST), so the email was kept here and not sent.', coalesce(fulfilled_at, cancelled_at), created
            from customer_order where id = o;
        end if;
    end loop;

    -- conversations with the price assistant: most end in an offer, some asked too much and were held to the limit
    for n in 1 .. 36 loop
        who := 1 + floor(random() * array_length(users, 1))::int;
        select va.* into v from variant va join product p on p.id = va.product_id where va.is_active and p.is_active order by random() limit 1;
        created := now() - (power(random(), 1.4) * 60) * interval '1 day';
        qty := (array[1, 3, 5, 6, 10, 12, 20, 30, 50])[1 + floor(random() * 9)::int];
        k := floor(random() * 100)::int;
        price := case when k < 30 then 50 + floor(random() * 40) when k < 60 then 15 + floor(random() * 15) else 3 + floor(random() * 10) end;   -- what they asked for
        tier := least(price, v.margin_floor_pct);                                                                                              -- what the shop allowed
        lg := (array['ru', 'ky', 'en', 'ru'])[1 + n % 4];
        s := gen_random_uuid();
        insert into negotiation_session (id, customer_id, variant_id, transcript, proposed_discount_pct, validated_discount_pct, created_at, quantity, offered_at)
        values (s, users[who], v.id, null, price, tier, created, qty, created + interval '20 seconds');
        insert into negotiation_turn (session_id, position, customer_message, reply, language, assistant, quantity, proposed_discount_pct, validated_discount_pct, created_at)
        values (s, 0,
            case lg when 'ru' then 'Возьму ' || qty || ' пар, сделаете скидку ' || price || '%?' when 'ky' then qty || ' жуп алам, ' || price || '% арзандатасызбы?' else 'I will take ' || qty || ' pairs, can you do ' || price || '% off?' end,
            case when tier < price then
                case lg when 'ru' then 'Лучшее, что я могу предложить: ' || tier || '% на ' || qty || ' пар.' when 'ky' then 'Колумдан келгени: ' || qty || ' жупка ' || tier || '%.' else 'The best I can do is ' || tier || '% on ' || qty || ' pairs.' end
            else case lg when 'ru' then 'Договорились: ' || tier || '% на ' || qty || ' пар.' when 'ky' then 'Макул: ' || qty || ' жупка ' || tier || '%.' else 'Deal: ' || tier || '% on ' || qty || ' pairs.' end end,
            lg, case when n % 3 = 0 then 'llm' else 'rule' end, qty, price, tier, created + interval '20 seconds');
        if random() < 0.35 then
            insert into negotiation_turn (session_id, position, customer_message, reply, language, assistant, quantity, proposed_discount_pct, validated_discount_pct, created_at)
            values (s, 1, case lg when 'ru' then 'А если возьму больше?' when 'ky' then 'Көбүрөөк алсамчы?' else 'And if I take more?' end,
                case lg when 'ru' then 'Цена на полке падает сама: смотрите лестницу цен на странице носка.' when 'ky' then 'Баа текчеде өзү түшөт: байпактын барагындагы баа тепкичин караңыз.' else 'The shelf price falls by itself: see the price ladder on the sock''s page.' end,
                lg, 'rule', qty, tier, tier, created + interval '2 minutes');
        end if;
        insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
        values (users[who], 'NEGOTIATION', 'NEGOTIATION_SESSION', s, null,
                jsonb_build_object('sku', v.sku, 'quantity', qty, 'proposedDiscountPct', price, 'validatedDiscountPct', tier), 'demo', created + interval '20 seconds');
    end loop;

    -- reviews from customers who received the sock; most published, a few waiting for the family, one turned down
    n := 0;
    for v in select * from (
                 select distinct on (va.product_id) va.product_id, c.customer_id, c.fulfilled_at, c.lang
                 from customer_order c join order_item oi on oi.order_id = c.id join variant va on va.id = oi.variant_id
                 where c.status = 'FULFILLED' and c.customer_id is not null
                 order by va.product_id, random()) r
             order by fulfilled_at limit 30 loop
        n := n + 1;
        insert into product_review (product_id, user_id, rating, author, body, status, created_at, moderated_at)
        values (v.product_id, v.customer_id,
            (array[5, 5, 5, 4, 5, 4, 3, 5, 5, 4])[1 + n % 10],
            (select split_part(display_name, ' ', 1) from app_user where id = v.customer_id),
            (array['Soft and warm, they stay up all day. Bought more for my husband.',
                   'Очень тёплые, носила всю зиму на рынке. Рекомендую!',
                   'Абдан жакшы байпак, балдарыма да алдым. Рахмат!',
                   'The colours are exactly as in the pictures. Fast pickup at the stall.',
                   'Качество отличное, после стирки не сели. Возьму ещё.',
                   'Great value for a family set: the price dropped when I took twelve.',
                   'Fine, but the size runs a little small. Take one size up.',
                   'Подарила маме на 8 Марта в коробке, она в восторге.',
                   'Жумшак, жылуу, ыңгайлуу. Кайра келем.',
                   'Courier came the next day in Bishkek. Socks are lovely.'])[1 + n % 10],
            case when n % 11 = 0 then 'REJECTED' when n > 26 then 'PENDING' else 'APPROVED' end,
            v.fulfilled_at + interval '3 days',
            case when n > 26 and n % 11 <> 0 then null else v.fulfilled_at + interval '4 days' end)
        on conflict (product_id, user_id) do nothing;
    end loop;

    -- people waiting for sold-out options (the dashboard lists them so the family knows what to reorder)
    for v in select va.id from variant va where va.is_active and va.stock_qty - va.reserved_qty <= 0 order by random() limit 12 loop
        for k in 1 .. 1 + floor(random() * 3)::int loop
            insert into stock_request (variant_id, user_id, created_at)
            values (v.id, users[1 + floor(random() * (array_length(users, 1) - 3))::int], now() - random() * interval '20 days')
            on conflict do nothing;
        end loop;
    end loop;

    -- wholesale and company requests in every state
    insert into wholesale_request (kind, company, city, contact_kind, contact, pairs, mix, note, status, staff_note, created_at, updated_at) values
        ('WHOLESALE', 'Kelechek Market, stall 14', 'Osh', 'WHATSAPP', '+996 700 123 456', 240,
         E'Classic Crew, Navy, M × 60\nClassic Crew, Grey, L × 60\nAla-Too Crew, Navy, M × 60\nArgyle Crew, Brown, M × 60', 'We sell at Kara-Suu on weekends.', 'NEW', null, now() - interval '5 hours', now() - interval '5 hours'),
        ('GIFTS', 'Bishkek IT Park', 'Bishkek', 'EMAIL', 'hr@example.com', 120,
         E'Ala-Too Box × 40\nBazaar Family Pack × 40\n8 March Gift Box × 40', 'New Year gifts for the team, with our logo on the card.', 'IN_PROGRESS', 'Venera called them; they want delivery to the office by 25 December.', now() - interval '2 days', now() - interval '1 day'),
        ('WHOLESALE', 'Sock corner, Tsum', 'Bishkek', 'TELEGRAM', '@tsum_socks_demo', 600,
         E'Classic Ankle, assorted × 300\nEveryday Cotton Ankle, assorted × 300', null, 'ANSWERED', 'Price sent: 8% off at 600 pairs, delivery Thursday.', now() - interval '9 days', now() - interval '7 days'),
        ('WHOLESALE', 'Almaty Family Store', 'Almaty', 'WHATSAPP', '+996 700 123 456', 360,
         E'Bear House Socks × 120\nBaby Bear Booties × 120\nAla-Too Ankle × 120', 'Cargo to Almaty, we pay the carrier.', 'CLOSED', 'Ordered and sent by bus cargo on 2 October.', now() - interval '32 days', now() - interval '28 days'),
        ('GIFTS', 'Naryn school No. 3', 'Naryn', 'PHONE', '+996 700 123 456', 80,
         E'Back to School Pack × 80', 'For the first-graders on 1 September.', 'CLOSED', 'Went to another supplier; asked us again for next year.', now() - interval '64 days', now() - interval '60 days'),
        ('WHOLESALE', 'Tashkent Textile Hub', 'Tashkent', 'EMAIL', 'buyer@example.com', 1200,
         E'Thermal and Heritage lines, assorted sizes', 'Can you send samples first?', 'NEW', null, now() - interval '1 day', now() - interval '1 day');

    -- the team's own changes, so the audit log shows who changed what in the catalogue and the settings
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select owner, 'VARIANT_UPDATED', 'VARIANT', va.id, jsonb_build_object('sku', va.sku, 'price', va.price + 1), jsonb_build_object('sku', va.sku, 'price', va.price),
           'demo', now() - (10 + random() * 40) * interval '1 day'
    from variant va where va.is_active order by random() limit 6;
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select staff, 'VARIANT_SUPPLY_UPDATED', 'VARIANT', va.id, jsonb_build_object('sku', va.sku, 'incomingQty', 0), jsonb_build_object('sku', va.sku, 'incomingQty', va.incoming_qty, 'restockEta', va.restock_eta),
           'demo', now() - (1 + random() * 20) * interval '1 day'
    from variant va where va.incoming_qty > 0 order by random() limit 6;
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select owner, 'PRODUCT_UPDATED', 'PRODUCT', p.id, jsonb_build_object('name', p.name, 'description', 'Old text'), jsonb_build_object('name', p.name, 'description', left(p.description, 80)),
           'demo', now() - (5 + random() * 50) * interval '1 day'
    from product p where p.is_active order by random() limit 5;
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select owner, 'PRICE_TIER_UPDATED', 'PRICE_TIER', pt2.id, jsonb_build_object('minPairs', pt2.min_pairs, 'discountPct', pt2.discount_pct + 1), jsonb_build_object('minPairs', pt2.min_pairs, 'discountPct', pt2.discount_pct),
           'demo', now() - interval '21 days'
    from price_tier pt2 order by min_pairs limit 1;
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select owner, 'DELIVERY_ZONE_UPDATED', 'DELIVERY_ZONE', dz.id, jsonb_build_object('name', dz.name, 'fee', dz.fee + 1), jsonb_build_object('name', dz.name, 'fee', dz.fee),
           'demo', now() - interval '15 days'
    from delivery_zone dz where dz.kind = 'COURIER' order by position limit 1;
    insert into audit_log_entry (actor_id, action, entity_type, entity_id, before_state, after_state, correlation_id, created_at)
    select super, 'CUSTOMER_TRUST_CHANGED', 'USER', au.id, '{"trusted":false}'::jsonb, jsonb_build_object('email', au.email, 'trusted', true), 'demo', now() - interval '30 days'
    from app_user au where au.trusted and au.role = 'CUSTOMER' limit 3;

    -- the demo customer keeps her details for the next checkout
    insert into customer_details (user_id, contact_name, contact_phone, address, country, zone_id, updated_at)
    select aida, 'Aida Demo', '+996 700 123 456', 'Chui avenue 120, apartment 14', 'KG', (select id from delivery_zone where kind = 'COURIER' order by position limit 1), now()
    on conflict (user_id) do nothing;
end $$;
