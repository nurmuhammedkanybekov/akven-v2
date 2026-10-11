-- Accounts and settings (Milestone 3).
--
-- SUPER_ADMIN is the person who runs the system (accounts, the AI assistant, the audit log); ADMIN stays the shop's
-- owners, who run the shop. Accounts get a display name, and credentials_changed_at lets a password reset or a
-- disabled account end every token issued before it.
alter table app_user drop constraint if exists app_user_role_chk;
alter table app_user add constraint app_user_role_chk check (role in ('CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'));
alter table app_user add column display_name varchar(80);
alter table app_user add column credentials_changed_at timestamptz;
comment on column app_user.role is 'CUSTOMER / STAFF / ADMIN / SUPER_ADMIN — mirrors com.akven.thesis.user.Role; kept in sync by the CHECK constraint.';

-- Small runtime settings that the super admin changes without a restart (for example which assistant answers the
-- chat). Never secrets: API keys stay in the environment.
create table app_setting (
    setting_key   varchar(60)  primary key,
    setting_value varchar(500) not null,
    updated_at    timestamptz  not null default now()
);

-- A negotiation is now a conversation: one row per message and answer, so the assistant sees what was already said and
-- the evaluation can read every turn. The session keeps the latest offer; offered_at is when it was made, which is what
-- the offer's time limit counts from.
create table negotiation_turn (
    id                     uuid primary key default gen_random_uuid(),
    session_id             uuid          not null references negotiation_session (id) on delete cascade,
    position               integer       not null check (position >= 0),
    customer_message       varchar(500)  not null,
    reply                  varchar(1000) not null,
    language               varchar(5)    not null default 'en',
    assistant              varchar(20)   not null,
    quantity               integer       not null check (quantity > 0),
    proposed_discount_pct  numeric(5, 2) not null check (proposed_discount_pct >= 0),
    validated_discount_pct numeric(5, 2) not null check (validated_discount_pct >= 0),
    created_at             timestamptz   not null default now(),
    constraint negotiation_turn_margin_chk check (validated_discount_pct <= proposed_discount_pct),
    constraint negotiation_turn_position_uq unique (session_id, position)
);
create index negotiation_turn_created_idx on negotiation_turn (created_at);

alter table negotiation_session add column offered_at timestamptz;
update negotiation_session set offered_at = created_at;
