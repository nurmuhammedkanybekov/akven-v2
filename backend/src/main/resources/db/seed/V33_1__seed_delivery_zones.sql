-- Demo delivery zones with example prices (in US dollars) and times. The owners replace them with their own.
update delivery_zone set active = false where name in ('Kyrgyzstan', 'Kazakhstan', 'Uzbekistan', 'Russia') and fee = 0;
insert into delivery_zone (country, name, fee, free_from, days_min, days_max, position) values
    ('KG', 'Bishkek', 2.00, 40.00, 1, 2, 1),
    ('KG', 'Chui region', 3.00, 60.00, 1, 3, 2),
    ('KG', 'Osh, Jalal-Abad and the south', 5.00, 80.00, 2, 4, 3),
    ('KG', 'Issyk-Kul, Naryn and Talas', 5.00, 80.00, 2, 5, 4),
    ('KZ', 'Almaty', 8.00, 120.00, 2, 4, 21),
    ('KZ', 'Rest of Kazakhstan', 12.00, null, 4, 8, 22),
    ('UZ', 'Tashkent', 10.00, 150.00, 3, 6, 31),
    ('RU', 'Moscow and St Petersburg', 15.00, 200.00, 5, 9, 41),
    ('RU', 'Rest of Russia', 18.00, null, 6, 12, 42);
