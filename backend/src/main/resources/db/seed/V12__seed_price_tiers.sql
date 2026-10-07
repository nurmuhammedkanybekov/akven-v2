-- Demo only: an example price ladder. The real steps and percentages are set by the owners in the admin panel.
insert into price_tier (min_pairs, discount_pct) values
    (20, 3.00),
    (30, 5.00),
    (50, 8.00),
    (100, 10.00);
