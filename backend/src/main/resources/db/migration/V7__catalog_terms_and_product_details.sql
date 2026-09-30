-- Admin-managed catalog structure and richer product details.
--
-- Until now "occasion" and "cut" were fixed lists (CHECK constraints). The owners need to add their own
-- sections (Classic, Sport, ...) and cuts (Mid-long, ...) from the admin panel, so they become rows in
-- catalog_term. Audience (MEN / WOMEN / KIDS / BUNDLES) stays a fixed list: it is the shop's top navigation.

create table catalog_term (
    id           uuid primary key default gen_random_uuid(),
    kind         varchar(16)  not null check (kind in ('SECTION', 'CUT')),
    slug         varchar(80)  not null,
    name         varchar(120) not null,
    description  varchar(500),
    position     integer      not null default 0 check (position >= 0),
    is_active    boolean      not null default true,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz  not null default now(),
    version      integer      not null default 0,
    constraint catalog_term_kind_slug_uq unique (kind, slug)
);

create trigger catalog_term_set_updated_at
    before update on catalog_term
    for each row execute function set_updated_at();

insert into catalog_term (kind, slug, name, position) values
    ('SECTION', 'classic',  'Classic',  0),
    ('SECTION', 'casual',   'Casual',   1),
    ('SECTION', 'sport',    'Sport',    2),
    ('SECTION', 'thermal',  'Thermal',  3),
    ('CUT',     'no-show',  'No-show',  0),
    ('CUT',     'ankle',    'Ankle',    1),
    ('CUT',     'crew',     'Crew',     2),
    ('CUT',     'mid-long', 'Mid-long', 3),
    ('CUT',     'knee-high','Knee-high',4);

alter table product
    add column section_id uuid references catalog_term (id),
    add column cut_id     uuid references catalog_term (id),
    add column quality    varchar(120),
    add column care       varchar(500),
    add column origin     varchar(80);

-- Carry over what V3 stored as fixed values. The old "occasion" names map onto the owners' section names.
update product set section_id = (select id from catalog_term where kind = 'SECTION' and slug =
    case product.occasion when 'DRESS' then 'classic' when 'EVERYDAY' then 'casual'
                          when 'SPORT' then 'sport'   when 'THERMAL'  then 'thermal' end)
 where occasion is not null;

update product set cut_id = (select id from catalog_term where kind = 'CUT' and slug =
    case product.cut when 'CREW' then 'crew' when 'ANKLE' then 'ankle'
                     when 'NO_SHOW' then 'no-show' when 'KNEE_HIGH' then 'knee-high' end)
 where cut is not null;

-- Dropping the columns also drops their CHECK constraints and indexes from V3.
alter table product drop column occasion, drop column cut;

alter table product add constraint product_bundle_no_terms_chk
    check (category <> 'BUNDLES' or (section_id is null and cut_id is null));

create index product_section_idx on product (section_id) where is_active;
create index product_cut_idx     on product (cut_id)     where is_active;

-- Colour swatch for the storefront: the colour name stays free text, the hex is what gets drawn.
alter table variant
    add column color_hex varchar(7)
        check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$');
