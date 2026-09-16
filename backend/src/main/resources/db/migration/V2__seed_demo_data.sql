-- Demo data for local development and thesis-defense screenshots.
--
-- Not gated behind an environment flag: Flyway runs every migration exactly
-- once per database, and this project has no shared production database yet
-- (see README "Running the backend locally"). Before there is one, this file
-- should be moved behind a Spring profile or a separate Flyway location —
-- noted in docs/architecture.md so it isn't forgotten.
--
-- Demo passwords are hashed with pgcrypto's bcrypt ('bf') right here, so
-- nothing that looks like a real credential is ever committed in plain text.

insert into app_user (email, password_hash, role) values
    ('admin@akven.test', crypt('changeme-admin', gen_salt('bf')), 'ADMIN'),
    ('staff@akven.test', crypt('changeme-staff', gen_salt('bf')), 'STAFF');

insert into product (slug, name, collection, description, fabric_composition) values
    ('wool-crew-classic', 'Wool Crew Classic', 'Everyday',
     'Mid-weight crew socks knitted on our Korean partner''s machines for the Ak&Ven house label.',
     '80% merino wool / 20% nylon'),
    ('bamboo-no-show', 'Bamboo No-Show', 'Summer',
     'Breathable no-show socks for warm-weather wear at the bazaar and beyond.',
     '70% bamboo viscose / 30% spandex');

insert into variant (product_id, sku, size, color, pack_size, price, cost_price, margin_floor_pct, stock_qty)
select id, 'WCC-BLK-M-1', 'M', 'Black', 1, 6.50, 2.80, 15.00, 120 from product where slug = 'wool-crew-classic'
union all
select id, 'WCC-BLK-M-3', 'M', 'Black', 3, 17.50, 8.40, 15.00, 60  from product where slug = 'wool-crew-classic'
union all
select id, 'WCC-GRY-L-1', 'L', 'Grey',  1, 6.50, 2.80, 15.00, 95  from product where slug = 'wool-crew-classic'
union all
select id, 'BNS-WHT-M-3', 'M', 'White', 3, 9.00, 3.60, 20.00, 200 from product where slug = 'bamboo-no-show';
