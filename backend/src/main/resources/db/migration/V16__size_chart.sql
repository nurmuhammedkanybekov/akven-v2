-- Size chart (Milestone 3, Phase 1d).
--
-- One row per sock size. The shop shows it by language: English shows foot length, EU and US sizes; Russian and Kyrgyz
-- show foot length and the local (RU / KG) shoe sizes. Every row also has the Korean size in millimetres from the label.
create table size_chart_row (
    id           uuid primary key default gen_random_uuid(),
    label        varchar(40)   not null,
    foot_cm_min  numeric(4, 1) not null check (foot_cm_min > 0),
    foot_cm_max  numeric(4, 1) not null,
    kr_mm_min    integer       not null check (kr_mm_min > 0),
    kr_mm_max    integer       not null,
    local_min    numeric(4, 1) not null check (local_min > 0),
    local_max    numeric(4, 1) not null,
    eu_min       numeric(4, 1) not null check (eu_min > 0),
    eu_max       numeric(4, 1) not null,
    us_label     varchar(40)   not null,
    position     integer       not null default 0,
    created_at   timestamptz   not null default now(),
    updated_at   timestamptz   not null default now(),
    version      integer       not null default 0,
    constraint size_chart_row_label_uq unique (label),
    constraint size_chart_row_ranges_chk check (foot_cm_max >= foot_cm_min and kr_mm_max >= kr_mm_min
        and local_max >= local_min and eu_max >= eu_min)
);

create trigger size_chart_row_set_updated_at
    before update on size_chart_row
    for each row execute function set_updated_at();

comment on column size_chart_row.local_min is 'Shoe size as used in Kyrgyzstan, Kazakhstan and Russia (RU sizing).';
comment on column size_chart_row.us_label is 'US sizes differ for women, men and children, so they are kept as text, e.g. "W 5.5–9.5".';
