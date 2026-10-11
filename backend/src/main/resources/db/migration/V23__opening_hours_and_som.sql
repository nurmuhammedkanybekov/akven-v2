-- Opening hours the shop can reason about, and prices in Kyrgyz som (Milestone 3).
--
-- Opening hours become structured: a time it opens, a time it closes, and the days it is open (a bit per day,
-- Monday = 1 ... Sunday = 64, 127 = every day). The site then says "open now, closes at 16:00" in Bishkek time, in every
-- language. The old free-text hours column stays as an optional note ("closed on 1 January").
alter table pickup_point add column opens_at time;
alter table pickup_point add column closes_at time;
alter table pickup_point add column open_days smallint not null default 127
    constraint pickup_point_open_days_chk check (open_days between 0 and 127);
alter table pickup_point add constraint pickup_point_hours_chk
    check ((opens_at is null and closes_at is null) or (opens_at is not null and closes_at is not null and closes_at > opens_at));

-- Prices are kept in US dollars (what the wallet charges); the owners set how many som a dollar is and how som prices
-- are rounded, and customers can see every price in som.
alter table shop_policy add column som_per_usd numeric(10, 2) not null default 87.50
    constraint shop_policy_som_rate_chk check (som_per_usd > 0);
alter table shop_policy add column som_rounding integer not null default 10
    constraint shop_policy_som_rounding_chk check (som_rounding in (1, 5, 10, 50, 100));
