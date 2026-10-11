-- Demo-only: the brand is now written AKVEN. Earlier demo seeds (already applied, so never edited) wrote "Ak&Ven";
-- this brings their text up to date.
update product_image set alt = replace(replace(replace(alt, 'Ak&Ven', 'AKVEN'), 'Ak and Ven', 'AKVEN'), 'AK&VEN', 'AKVEN')
 where alt like '%Ak&Ven%' or alt like '%Ak and Ven%' or alt like '%AK&VEN%';
update product set description = replace(description, 'Ak&Ven', 'AKVEN') where description like '%Ak&Ven%';
update pickup_point set name = replace(name, 'AK&VEN', 'AKVEN') where name like '%AK&VEN%';
