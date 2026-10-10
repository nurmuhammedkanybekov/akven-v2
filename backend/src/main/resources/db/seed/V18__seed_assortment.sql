-- Demo-only: a fuller assortment, closer to what the stall really carries. Business and argyle socks, five-toe
-- socks, compression, brushed home socks with grip, character socks for children, the oimo ornament line, and the
-- gift boxes for 8 March, 23 February, Nooruz, New Year and the start of school. Names, prices and stock are examples;
-- the owners replace them from the admin. Images are drawn by frontend/scripts/generate-product-art.mjs.

insert into catalog_term (kind, slug, name, position) values
    ('SECTION', 'home',     'Home',     4),
    ('SECTION', 'heritage', 'Heritage', 5)
on conflict (kind, slug) do nothing;

insert into product (slug, name, category, section_id, cut_id, collection, description, fabric_composition, quality, care, origin)
select v.slug, v.name, v.category, s.id, c.id, v.collection, v.description, v.fabric, v.quality,
       'Machine wash at 30 °C inside out. Do not tumble dry hot. Do not bleach.', 'Korea'
from (values
    ('business-rib-crew', 'Business Rib Crew', 'MEN', 'classic', 'crew', 'Office',
     'Fine rib in deep navy and charcoal. Sits flat under a suit trouser and keeps its shape wash after wash.',
     '70% mercerised cotton / 28% nylon / 2% elastane', 'Mercerised cotton'),
    ('argyle-crew', 'Argyle Crew', 'MEN', 'classic', 'crew', 'Office',
     'The classic diamond in navy, gold and cream. A small surprise between the shoe and the trouser.',
     '75% combed cotton / 23% nylon / 2% elastane', 'Soft combed cotton'),
    ('seoul-stripe-crew', 'Seoul Stripe Crew', 'MEN', 'casual', 'crew', 'Seoul',
     'Bright stripes in the colours of a Seoul street market. Made for sneakers and turned-up jeans.',
     '80% combed cotton / 18% nylon / 2% elastane', 'Soft combed cotton'),
    ('five-toe-ankle', 'Five-Toe Ankle', 'MEN', 'casual', 'ankle', 'Seoul',
     'Every toe in its own pocket, the Korean way. Dry between the toes and steady in sport shoes.',
     '85% combed cotton / 13% nylon / 2% elastane', 'Soft combed cotton'),
    ('run-compression', 'Run Compression', 'MEN', 'sport', 'mid-long', 'Active',
     'Graduated compression around the calf and the arch. For long runs, long flights and long shifts on your feet.',
     '60% nylon / 30% polyester / 10% elastane', 'Graduated compression'),
    ('mountain-hiker-crew', 'Mountain Hiker', 'MEN', 'thermal', 'crew', 'Winter',
     'Cushioned terry sole and a merino blend for walks in Ala-Archa. Warm in the cold, dry when it is not.',
     '50% merino wool / 35% acrylic / 13% nylon / 2% elastane', 'Premium merino'),
    ('bamboo-no-show-men', 'Bamboo Loafer No-Show', 'MEN', 'casual', 'no-show', 'Everyday',
     'Invisible in loafers and sneakers, with a silicone heel so it never slips off. Three pairs in a pack.',
     '70% bamboo viscose / 26% nylon / 4% elastane', 'Breathable bamboo'),
    ('oimo-crew', 'Oimo Ornament Crew', 'MEN', 'heritage', 'crew', 'Heritage',
     'Our own design: the Kyrgyz oimo band knitted into a Korean sock. A limited run for Nooruz and for gifts.',
     '80% combed cotton / 18% nylon / 2% elastane', 'Soft combed cotton'),

    ('lace-trim-ankle', 'Lace Trim Ankle', 'WOMEN', 'casual', 'ankle', 'Seoul',
     'A soft lace frill on a cotton ankle sock. For loafers, Mary Janes and summer dresses. Three pairs in a pack.',
     '78% combed cotton / 20% nylon / 2% elastane', 'Soft combed cotton'),
    ('little-heart-crew', 'Little Heart Crew', 'WOMEN', 'casual', 'crew', 'Seoul',
     'Small red hearts on a blush crew sock. The pair people ask about.',
     '80% combed cotton / 18% nylon / 2% elastane', 'Soft combed cotton'),
    ('cashmere-touch-crew', 'Cashmere-Touch Crew', 'WOMEN', 'thermal', 'crew', 'Winter',
     'Brushed yarn that feels like cashmere, at the price of a sock you can wear every day.',
     '40% wool / 35% viscose / 23% nylon / 2% elastane', 'Brushed, cashmere feel'),
    ('polka-no-show', 'Polka No-Show', 'WOMEN', 'casual', 'no-show', 'Everyday',
     'Tiny dots, a deep cut and a silicone heel grip. Three pairs in a pack.',
     '80% combed cotton / 18% nylon / 2% elastane', 'Soft combed cotton'),
    ('yoga-grip', 'Yoga Grip', 'WOMEN', 'sport', 'ankle', 'Active',
     'Non-slip dots under the whole sole, for yoga, pilates and wooden floors.',
     '75% cotton / 22% nylon / 3% elastane, silicone dots', 'Non-slip sole'),
    ('cloud-home-socks', 'Cloud Home Socks', 'WOMEN', 'home', 'mid-long', 'Home',
     'Thick, soft and brushed inside, with grip dots under the sole. For evenings when the radiators are not enough.',
     '92% polyester / 8% elastane, silicone dots', 'Brushed fleece'),
    ('oimo-knee-high', 'Oimo Ornament Knee-High', 'WOMEN', 'heritage', 'knee-high', 'Heritage',
     'Two oimo bands on a warm wool knee-high. Our design, knitted in Korea, for Bishkek winters.',
     '55% wool / 42% nylon / 3% elastane', 'Warm wool blend'),
    ('sparkle-ankle', 'Sparkle Ankle', 'WOMEN', 'casual', 'ankle', 'Evening',
     'Fine yarn with a gentle shimmer. For heels, holidays and evenings out.',
     '80% nylon / 15% metallic yarn / 5% elastane', 'Shimmer yarn'),
    ('five-toe-no-show', 'Five-Toe No-Show', 'WOMEN', 'casual', 'no-show', 'Seoul',
     'A no-show with separate toes, so it stays put in sandals and ballet flats. Three pairs in a pack.',
     '85% combed cotton / 13% nylon / 2% elastane', 'Soft combed cotton'),
    ('rib-knee-high', 'Rib Knee-High', 'WOMEN', 'classic', 'knee-high', 'Office',
     'Fine-rib knee-high in black and camel, for skirts and boots.',
     '70% cotton / 28% nylon / 2% elastane', 'Soft combed cotton'),

    ('little-bear-crew', 'Little Bear Crew', 'KIDS', 'casual', 'crew', 'Little Ones',
     'A bear face on the leg and ears on the cuff. Soft cotton, gentle elastic, no itchy seams. Three pairs in a pack.',
     '80% combed cotton / 18% polyester / 2% elastane', 'Soft combed cotton'),
    ('dino-ankle', 'Dino Ankle', 'KIDS', 'casual', 'ankle', 'Little Ones',
     'Spikes down the back and spots on the side. The pair every five-year-old wants. Three pairs in a pack.',
     '78% cotton / 20% polyester / 2% elastane', 'Soft combed cotton'),
    ('kids-home-grip', 'Kids Home Grip', 'KIDS', 'home', 'crew', 'Little Ones',
     'Non-slip dots on the sole for running around the flat. Warm terry inside.',
     '75% cotton / 23% polyester / 2% elastane, silicone dots', 'Non-slip sole'),
    ('school-knee-high', 'School Knee-High', 'KIDS', 'classic', 'knee-high', 'Back to School',
     'Navy knee-highs with two white stripes for school uniforms. Reinforced heel and toe. Three pairs in a pack.',
     '75% cotton / 23% nylon / 2% elastane', 'Soft combed cotton'),
    ('first-steps', 'First Steps', 'KIDS', 'casual', 'ankle', 'Little Ones',
     'Tiny socks with soft grip dots for the first steps. Seamless toe, gentle on new feet. Three pairs in a pack.',
     '85% combed cotton / 13% polyester / 2% elastane, silicone dots', 'Soft combed cotton'),
    ('snowflake-crew-kids', 'Snowflake Crew', 'KIDS', 'thermal', 'crew', 'Winter',
     'A warm brushed crew sock with snowflakes, for sledging and the walk to school.',
     '60% acrylic / 25% wool / 13% nylon / 2% elastane', 'Warm wool blend')
) as v(slug, name, category, section, cut, collection, description, fabric, quality)
join catalog_term s on s.kind = 'SECTION' and s.slug = v.section
join catalog_term c on c.kind = 'CUT' and c.slug = v.cut;

insert into product (slug, name, category, collection, description, fabric_composition, quality, care, origin) values
    ('gift-box-8-march', '8 March Gift Box', 'BUNDLES', 'Gift boxes',
     'Five pairs for her in a gift box: lace trim, little hearts, sparkle, cashmere-touch and a no-show.',
     'Mixed cotton and wool blends', 'Gift box', 'See each pair.', 'Korea'),
    ('gift-box-23-feb', '23 February Gift Box', 'BUNDLES', 'Gift boxes',
     'Five pairs for him in a navy box: business rib, argyle, merino, sport and an oimo crew.',
     'Mixed cotton and wool blends', 'Gift box', 'See each pair.', 'Korea'),
    ('nooruz-box', 'Nooruz Box', 'BUNDLES', 'Gift boxes',
     'A family box for the spring new year: oimo ornament socks for two adults and two children.',
     'Combed cotton and wool blends', 'Gift box', 'See each pair.', 'Korea'),
    ('new-year-box', 'New Year Box', 'BUNDLES', 'Gift boxes',
     'Snowflakes and warm socks for the whole family, wrapped and ready to go under the tree.',
     'Wool and brushed blends', 'Gift box', 'See each pair.', 'Korea'),
    ('back-to-school-pack', 'Back to School Pack', 'BUNDLES', 'Back to School',
     'Seven pairs for a school week: knee-highs, crews and sport ankles.',
     'Cotton blends', 'Value pack', 'See each pair.', 'Korea'),
    ('office-week-pack', 'Office Week Pack', 'BUNDLES', 'Office',
     'Seven pairs of dress socks, one for each day, in navy, black and charcoal.',
     'Mercerised cotton and merino blends', 'Value pack', 'See each pair.', 'Korea');

insert into variant (product_id, sku, size, color, color_hex, pack_size, price, cost_price, margin_floor_pct, stock_qty, incoming_qty, restock_eta, case_pairs)
select p.id, v.sku, v.size, v.color, v.hex, v.pack, v.price, v.cost, v.floor, v.stock, v.incoming,
       case when v.eta_days is null then null else current_date + v.eta_days end, v.case_pairs
from (values
    ('BRC-NVY-M-1', 'business-rib-crew',   'M',  'Navy',     '#1F2A44', 1,  7.00, 3.00, 15.00, 120,   0, null::int, 240),
    ('BRC-CHR-L-1', 'business-rib-crew',   'L',  'Charcoal', '#4A4D52', 1,  7.00, 3.00, 15.00,  90,   0, null, 240),
    ('ARG-NVY-M-1', 'argyle-crew',         'M',  'Navy',     '#1F2A44', 1,  7.50, 3.20, 15.00,  60,   0, null, 240),
    ('ARG-BRN-L-1', 'argyle-crew',         'L',  'Brown',    '#6B4A35', 1,  7.50, 3.20, 15.00,   4,   0, null, 240),
    ('SSC-SKY-M-3', 'seoul-stripe-crew',   'M',  'Sky',      '#8FB1CF', 3, 15.00, 6.60, 18.00,  70,   0, null, 200),
    ('SSC-RED-L-3', 'seoul-stripe-crew',   'L',  'Red',      '#B8323A', 3, 15.00, 6.60, 18.00,  45,   0, null, 200),
    ('FTA-BLK-M-1', 'five-toe-ankle',      'M',  'Black',    '#23211D', 1,  5.50, 2.40, 15.00, 110,   0, null, 240),
    ('FTA-GRY-L-1', 'five-toe-ankle',      'L',  'Grey',     '#8A8D91', 1,  5.50, 2.40, 15.00,  80,   0, null, 240),
    ('RCO-BLK-M-1', 'run-compression',     'M',  'Black',    '#23211D', 1, 11.00, 4.80, 15.00,  35,   0, null, 200),
    ('RCO-NVY-L-1', 'run-compression',     'L',  'Navy',     '#1F2A44', 1, 11.00, 4.80, 15.00,   0,  60, 6, 200),
    ('MHC-OLV-L-1', 'mountain-hiker-crew', 'L',  'Olive',    '#7B7D4A', 1, 10.00, 4.30, 15.00,  50,   0, null, 200),
    ('MHC-BRN-M-1', 'mountain-hiker-crew', 'M',  'Brown',    '#6B4A35', 1, 10.00, 4.30, 15.00,  40,   0, null, 200),
    ('BNM-BLK-L-3', 'bamboo-no-show-men',  'L',  'Black',    '#23211D', 3, 12.00, 5.20, 18.00, 150,   0, null, 240),
    ('BNM-WHT-M-3', 'bamboo-no-show-men',  'M',  'White',    '#EFECE4', 3, 12.00, 5.20, 18.00, 130,   0, null, 240),
    ('OIM-NVY-M-1', 'oimo-crew',           'M',  'Navy',     '#1F2A44', 1,  8.50, 3.60, 15.00,   0, 120, 9, 200),
    ('OIM-CRM-L-1', 'oimo-crew',           'L',  'Cream',    '#E9DFC8', 1,  8.50, 3.60, 15.00,  40,   0, null, 200),

    ('LTA-WHT-S-3', 'lace-trim-ankle',     'S',  'White',    '#EFECE4', 3, 13.00, 5.70, 18.00,  80,   0, null, 240),
    ('LTA-ROS-M-3', 'lace-trim-ankle',     'M',  'Rose',     '#D9A3A6', 3, 13.00, 5.70, 18.00,  65,   0, null, 240),
    ('LHC-PNK-S-1', 'little-heart-crew',   'S',  'Pink',     '#E7B4C4', 1,  5.50, 2.40, 15.00, 100,   0, null, 240),
    ('LHC-CRM-M-1', 'little-heart-crew',   'M',  'Cream',    '#E9DFC8', 1,  5.50, 2.40, 15.00,  90,   0, null, 240),
    ('CTC-OAT-S-1', 'cashmere-touch-crew', 'S',  'Oat',      '#E4D6BD', 1,  9.00, 3.90, 15.00,  55,   0, null, 200),
    ('CTC-LIL-M-1', 'cashmere-touch-crew', 'M',  'Lilac',    '#B9A7D6', 1,  9.00, 3.90, 15.00,  45,   0, null, 200),
    ('PNS-ROS-S-3', 'polka-no-show',       'S',  'Rose',     '#D9A3A6', 3, 11.00, 4.80, 18.00, 120,   0, null, 240),
    ('PNS-BLK-M-3', 'polka-no-show',       'M',  'Black',    '#23211D', 3, 11.00, 4.80, 18.00, 100,   0, null, 240),
    ('YGP-SAG-S-1', 'yoga-grip',           'S',  'Sage',     '#9DB49C', 1,  7.00, 3.00, 15.00,  70,   0, null, 200),
    ('YGP-LIL-M-1', 'yoga-grip',           'M',  'Lilac',    '#B9A7D6', 1,  7.00, 3.00, 15.00,  60,   0, null, 200),
    ('CHS-LIL-M-1', 'cloud-home-socks',    'M',  'Lilac',    '#B9A7D6', 1,  8.00, 3.40, 15.00,  85,   0, null, 200),
    ('CHS-CRM-M-1', 'cloud-home-socks',    'M',  'Cream',    '#E9DFC8', 1,  8.00, 3.40, 15.00,   3,   0, null, 200),
    ('OKH-CRM-S-1', 'oimo-knee-high',      'S',  'Cream',    '#E9DFC8', 1, 11.00, 4.70, 15.00,  30,   0, null, 200),
    ('OKH-BLK-M-1', 'oimo-knee-high',      'M',  'Black',    '#23211D', 1, 11.00, 4.70, 15.00,   0,  80, 12, 200),
    ('SPA-BLK-S-1', 'sparkle-ankle',       'S',  'Black',    '#23211D', 1,  6.50, 2.80, 15.00,  75,   0, null, 240),
    ('SPA-ROS-M-1', 'sparkle-ankle',       'M',  'Rose',     '#D9A3A6', 1,  6.50, 2.80, 15.00,  50,   0, null, 240),
    ('FTN-BGE-S-3', 'five-toe-no-show',    'S',  'Beige',    '#CDB99A', 3, 12.00, 5.20, 18.00,  90,   0, null, 240),
    ('RKH-BLK-S-1', 'rib-knee-high',       'S',  'Black',    '#23211D', 1,  9.50, 4.10, 15.00,  60,   0, null, 200),
    ('RKH-CAM-M-1', 'rib-knee-high',       'M',  'Camel',    '#B08D57', 1,  9.50, 4.10, 15.00,  40,   0, null, 200),

    ('LBC-BGE-S-3', 'little-bear-crew',    'S',  'Beige',    '#CDB99A', 3, 11.00, 4.70, 18.00,  90,   0, null, 240),
    ('LBC-BGE-M-3', 'little-bear-crew',    'M',  'Beige',    '#CDB99A', 3, 11.00, 4.70, 18.00,  70,   0, null, 240),
    ('DIN-MNT-S-3', 'dino-ankle',          'S',  'Mint',     '#A7CBB8', 3, 10.50, 4.50, 18.00, 100,   0, null, 240),
    ('DIN-SKY-M-3', 'dino-ankle',          'M',  'Sky',      '#8FB1CF', 3, 10.50, 4.50, 18.00,  80,   0, null, 240),
    ('KHG-RED-S-1', 'kids-home-grip',      'S',  'Red',      '#B8323A', 1,  5.00, 2.10, 15.00,  95,   0, null, 240),
    ('KHG-SKY-M-1', 'kids-home-grip',      'M',  'Sky',      '#8FB1CF', 1,  5.00, 2.10, 15.00,  85,   0, null, 240),
    ('SKH-NVY-S-3', 'school-knee-high',    'S',  'Navy',     '#1F2A44', 3, 12.00, 5.20, 18.00, 140,   0, null, 240),
    ('SKH-NVY-M-3', 'school-knee-high',    'M',  'Navy',     '#1F2A44', 3, 12.00, 5.20, 18.00, 120,   0, null, 240),
    ('FST-PNK-XS-3','first-steps',         'XS', 'Pink',     '#E7B4C4', 3,  9.00, 3.90, 18.00,  60,   0, null, 240),
    ('FST-SKY-XS-3','first-steps',         'XS', 'Sky',      '#8FB1CF', 3,  9.00, 3.90, 18.00,  55,   0, null, 240),
    ('SFC-RED-S-1', 'snowflake-crew-kids', 'S',  'Red',      '#B8323A', 1,  6.00, 2.60, 15.00,  70,   0, null, 200),
    ('SFC-NVY-M-1', 'snowflake-crew-kids', 'M',  'Navy',     '#1F2A44', 1,  6.00, 2.60, 15.00,  50,   0, null, 200),

    ('GB8-MIX-1',   'gift-box-8-march',    null, 'Mixed',    '#D9A3A6', 1, 32.00, 14.00, 15.00, 40,   0, null, null),
    ('GB23-MIX-1',  'gift-box-23-feb',     null, 'Mixed',    '#1F2A44', 1, 34.00, 15.00, 15.00, 40,   0, null, null),
    ('NRZ-MIX-1',   'nooruz-box',          null, 'Mixed',    '#9B4A3A', 1, 36.00, 15.80, 15.00, 0,   50, 14, null),
    ('NYB-MIX-1',   'new-year-box',        null, 'Mixed',    '#2F5A46', 1, 38.00, 16.70, 15.00, 25,   0, null, null),
    ('BTS-MIX-1',   'back-to-school-pack', null, 'Mixed',    '#1F2A44', 1, 24.00, 10.50, 15.00, 60,   0, null, null),
    ('OWP-MIX-1',   'office-week-pack',    null, 'Mixed',    '#4A4D52', 1, 39.00, 17.20, 15.00, 35,   0, null, null)
) as v(sku, slug, size, color, hex, pack, price, cost, floor, stock, incoming, eta_days, case_pairs)
join product p on p.slug = v.slug;

-- Two drawn images for every product: the sock on its own, and the pair (or the open box).
insert into product_image (product_id, url, alt, position)
select p.id, '/media/products/' || p.slug || '-1.svg', p.name || ' - Ak and Ven', 0
  from product p
 where not exists (select 1 from product_image i where i.product_id = p.id and i.position = 0);

insert into product_image (product_id, url, alt, position)
select p.id, '/media/products/' || p.slug || '-2.svg', p.name || ', the pair - Ak and Ven', 1
  from product p
 where not exists (select 1 from product_image i where i.product_id = p.id and i.position = 1);
