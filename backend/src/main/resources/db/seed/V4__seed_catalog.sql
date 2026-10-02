-- Extra demo catalog so the storefront filters, pagination and screenshots have
-- realistic data to work with. Demo-only, like V2 (see the note there about moving
-- seed data behind a Spring profile before a shared database exists).

insert into product (slug, name, category, cut, occasion, collection, description, fabric_composition) values
    ('merino-dress-black', 'Merino Dress Sock', 'MEN', 'CREW', 'DRESS', 'Office',
     'Fine-gauge crew sock with a smooth toe seam. Quiet enough for a suit, tough enough for a full day.',
     '75% merino wool / 23% nylon / 2% elastane'),
    ('sport-cushion-crew', 'Sport Cushion Crew', 'MEN', 'CREW', 'SPORT', 'Active',
     'Cushioned sole and arch support for running, football and long days on your feet.',
     '68% cotton / 28% polyester / 4% elastane'),
    ('thermal-knee-high', 'Thermal Knee-High', 'MEN', 'KNEE_HIGH', 'THERMAL', 'Winter',
     'Thick terry-lined knee-highs for Bishkek winters. Stay up without squeezing.',
     '60% wool / 37% acrylic / 3% elastane'),
    ('cotton-ankle-daily', 'Cotton Ankle Daily', 'MEN', 'ANKLE', 'EVERYDAY', 'Everyday',
     'Soft combed-cotton ankle sock. The one you reach for without thinking.',
     '82% combed cotton / 16% nylon / 2% elastane'),
    ('soft-cotton-ankle', 'Soft Cotton Ankle', 'WOMEN', 'ANKLE', 'EVERYDAY', 'Everyday',
     'Light, soft and seamless at the toe. Available in a calm palette of everyday colors.',
     '80% combed cotton / 18% nylon / 2% elastane'),
    ('wool-knee-high-women', 'Wool Knee-High', 'WOMEN', 'KNEE_HIGH', 'THERMAL', 'Winter',
     'Warm knee-high wool blend that sits neatly under boots.',
     '55% wool / 42% nylon / 3% elastane'),
    ('sport-ankle-women', 'Sport Ankle Grip', 'WOMEN', 'ANKLE', 'SPORT', 'Active',
     'Breathable mesh top with a silicone heel grip so the sock stays where it belongs.',
     '65% cotton / 30% polyester / 5% elastane'),
    ('kids-cartoon-crew', 'Kids Cartoon Crew', 'KIDS', 'CREW', 'EVERYDAY', 'Little Ones',
     'Bright, playful crew socks that survive the playground. Gentle elastic, no itchy seams.',
     '78% cotton / 20% polyester / 2% elastane'),
    ('kids-sport-ankle', 'Kids Sport Ankle', 'KIDS', 'ANKLE', 'SPORT', 'Little Ones',
     'Reinforced heel and toe for football, school sport and everything in between.',
     '70% cotton / 27% polyester / 3% elastane');

insert into product (slug, name, category, collection, description, fabric_composition) values
    ('bazaar-family-pack', 'Bazaar Family Pack', 'BUNDLES', 'Family',
     'Ten pairs for the whole family in one go: men, women and kids. Priced the way the bazaar would do it.',
     'Mixed cotton blends'),
    ('winter-warm-bundle', 'Winter Warm Bundle', 'BUNDLES', 'Winter',
     'Three thermal pairs picked for the coldest weeks of the year.',
     'Wool blends');

insert into variant (product_id, sku, size, color, pack_size, price, cost_price, margin_floor_pct, stock_qty)
select p.id, v.sku, v.size, v.color, v.pack, v.price, v.cost, v.floor, v.stock
from (values
    ('MDB-BLK-M-1', 'merino-dress-black',  'M', 'Black',    1,  8.00,  3.40, 15.00,  80),
    ('MDB-NVY-L-1', 'merino-dress-black',  'L', 'Navy',     1,  8.00,  3.40, 15.00,  55),
    ('SCC-GRY-M-1', 'sport-cushion-crew',  'M', 'Grey',     1,  6.00,  2.40, 15.00, 140),
    ('SCC-WHT-L-3', 'sport-cushion-crew',  'L', 'White',    3, 16.00,  7.20, 18.00,  70),
    ('TKH-GRY-L-1', 'thermal-knee-high',   'L', 'Charcoal', 1,  9.50,  4.10, 15.00,  40),
    ('TKH-BRN-M-1', 'thermal-knee-high',   'M', 'Brown',    1,  9.50,  4.10, 15.00,   0),
    ('CAD-BLK-M-3', 'cotton-ankle-daily',  'M', 'Black',    3, 13.50,  6.00, 20.00, 160),
    ('CAD-WHT-L-3', 'cotton-ankle-daily',  'L', 'White',    3, 13.50,  6.00, 20.00, 110),
    ('SCA-BGE-S-3', 'soft-cotton-ankle',   'S', 'Beige',    3, 12.50,  5.50, 20.00, 130),
    ('SCA-ROS-M-3', 'soft-cotton-ankle',   'M', 'Rose',     3, 12.50,  5.50, 20.00,  90),
    ('WKH-CRM-M-1', 'wool-knee-high-women','M', 'Cream',    1,  9.00,  3.90, 15.00,  45),
    ('WKH-BLK-S-1', 'wool-knee-high-women','S', 'Black',    1,  9.00,  3.90, 15.00,  60),
    ('SAG-WHT-M-2', 'sport-ankle-women',   'M', 'White',    2, 10.00,  4.40, 18.00, 100),
    ('SAG-PNK-S-2', 'sport-ankle-women',   'S', 'Pink',     2, 10.00,  4.40, 18.00,  75),
    ('KCC-MIX-S-3', 'kids-cartoon-crew',   'S', 'Mixed',    3, 10.50,  4.50, 20.00, 120),
    ('KCC-MIX-M-3', 'kids-cartoon-crew',   'M', 'Mixed',    3, 10.50,  4.50, 20.00,  85),
    ('KSA-WHT-M-3', 'kids-sport-ankle',    'M', 'White',    3, 11.00,  4.80, 18.00,  95),
    ('BFP-MIX-A-10','bazaar-family-pack',  'One size', 'Mixed', 10, 34.00, 17.00, 10.00, 50),
    ('WWB-GRY-A-3', 'winter-warm-bundle',  'One size', 'Grey',   3, 25.00, 12.30, 12.00, 35)
) as v(sku, slug, size, color, pack, price, cost, floor, stock)
join product p on p.slug = v.slug;
