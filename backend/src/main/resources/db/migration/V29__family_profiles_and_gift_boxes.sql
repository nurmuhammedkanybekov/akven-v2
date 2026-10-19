-- Family profiles and gift boxes (Milestone 3, final round).
--
-- A customer can keep the family they buy for: who each person is, their shoe size and how many pairs they usually
-- take. The family planner on the home page and the size picker on a product page read it, so the sizes are worked
-- out once. A birthday (day and month are what matter) lets the account page say whose gift is coming up.
create table family_member (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid        not null references app_user (id) on delete cascade,
    position   smallint    not null constraint family_member_position_chk check (position between 0 and 11),
    name       varchar(40),
    role       varchar(16) not null
        constraint family_member_role_chk check (role in ('dad', 'mom', 'son', 'daughter', 'grandpa', 'grandma', 'baby')),
    shoe_size  smallint    not null constraint family_member_shoe_chk check (shoe_size between 14 and 50),
    pairs      smallint    not null default 3 constraint family_member_pairs_chk check (pairs between 1 and 30),
    birthday   date,
    created_at timestamptz not null default now(),
    constraint family_member_place unique (user_id, position)
);

-- An order can go out as a gift: the family packs it in a box of the chosen colour with a ribbon and a hand-written
-- card. The card's words are kept exactly as typed (and shown as text, never as markup). hide_prices asks the family
-- to leave the receipt out of the box.
alter table customer_order add column gift_box varchar(12)
    constraint customer_order_gift_box_chk check (gift_box in ('KRAFT', 'NAVY', 'RED'));
alter table customer_order add column gift_ribbon varchar(12)
    constraint customer_order_gift_ribbon_chk check (gift_ribbon in ('GOLD', 'RED', 'WHITE'));
alter table customer_order add column gift_to varchar(60);
alter table customer_order add column gift_from varchar(60);
alter table customer_order add column gift_message varchar(300);
alter table customer_order add column gift_hide_prices boolean not null default false;
alter table customer_order add constraint customer_order_gift_chk check (
    (gift_box is null and gift_ribbon is null and gift_to is null and gift_from is null and gift_message is null and not gift_hide_prices)
    or (gift_box is not null and gift_ribbon is not null));
