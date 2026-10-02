-- Catalog taxonomy (Milestone 2, Phase B).
--
-- category : who it is for -> top navigation of the storefront (Men / Women / Kids / Bundles)
-- cut      : what it looks like -> filter chip (crew, ankle, no-show, knee-high)
-- occasion : what it is for -> filter chip (everyday, sport, thermal, dress)
--
-- Bundles are a category of their own (the bazaar pitch "take three, pay less") and
-- therefore carry no cut/occasion. Everything is a varchar + CHECK instead of a
-- native enum type so adding a value later is a one-line migration.

alter table product
    add column category varchar(16),
    add column cut      varchar(16),
    add column occasion varchar(16);

-- Back-fill the two products seeded by V2, then make category mandatory.
update product set category = 'MEN',   cut = 'CREW',    occasion = 'EVERYDAY' where slug = 'wool-crew-classic';
update product set category = 'WOMEN', cut = 'NO_SHOW', occasion = 'EVERYDAY' where slug = 'bamboo-no-show';
update product set category = 'MEN' where category is null;

alter table product alter column category set not null;

alter table product
    add constraint product_category_chk check (category in ('MEN', 'WOMEN', 'KIDS', 'BUNDLES')),
    add constraint product_cut_chk      check (cut is null or cut in ('CREW', 'ANKLE', 'NO_SHOW', 'KNEE_HIGH')),
    add constraint product_occasion_chk check (occasion is null or occasion in ('EVERYDAY', 'SPORT', 'THERMAL', 'DRESS')),
    add constraint product_bundle_no_facets_chk
        check (category <> 'BUNDLES' or (cut is null and occasion is null));

create index product_category_idx on product (category) where is_active;
create index product_cut_idx      on product (cut)      where is_active;
create index product_occasion_idx on product (occasion) where is_active;
