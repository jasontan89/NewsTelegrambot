-- Users (mirrors Telegram identity, decoupled from Supabase's own auth.users if you mint custom JWTs)
create table hs_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique not null,
  username text,
  first_name text,
  photo_url text,
  timezone text default 'Asia/Singapore',
  created_at timestamptz default now()
);

-- Habits
create table hs_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references hs_users(id) on delete cascade not null,
  name text not null,
  emoji text,
  category text check (category in ('fitness','nutrition','supplement','sleep','custom')),
  habit_type text check (habit_type in ('boolean','quantitative','time_window','multi_check')) not null,
  unit text,                          -- e.g. 'km', 'hours', 'mg'
  target_value numeric,               -- e.g. target km, target hours fasted
  schedule jsonb default '{"days":"daily"}'::jsonb,  -- daily / weekday list / N-times-per-week
  color text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Stacks (habit groupings, e.g. "Morning Stack")
create table hs_stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references hs_users(id) on delete cascade not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table hs_stack_habits (
  stack_id uuid references hs_stacks(id) on delete cascade,
  habit_id uuid references hs_habits(id) on delete cascade,
  sort_order int default 0,
  primary key (stack_id, habit_id)
);

-- Daily logs (one row per habit per day; supports retroactive edits)
create table hs_habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references hs_habits(id) on delete cascade not null,
  user_id uuid references hs_users(id) on delete cascade not null,
  log_date date not null,
  completed boolean,                  -- for boolean habits
  value numeric,                      -- for quantitative habits
  start_time timestamptz,             -- for time_window habits
  end_time timestamptz,
  note text,
  logged_via text default 'app' check (logged_via in ('app','bot')),
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);

-- Reminders
create table hs_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references hs_users(id) on delete cascade not null,
  stack_id uuid references hs_stacks(id) on delete set null,
  habit_id uuid references hs_habits(id) on delete set null,
  send_at time not null,              -- local time, converted using users.timezone
  days jsonb default '["mon","tue","wed","thu","fri","sat","sun"]'::jsonb,
  active boolean default true
);

alter table hs_users enable row level security;
alter table hs_habits enable row level security;
alter table hs_stacks enable row level security;
alter table hs_stack_habits enable row level security;
alter table hs_habit_logs enable row level security;
alter table hs_reminders enable row level security;

-- The system will use custom JWT where sub is the telegram_user_id or internal uuid
create policy "own users only" on hs_users
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "own habits only" on hs_habits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own stacks only" on hs_stacks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own stack_habits only" on hs_stack_habits
  for all to authenticated
  using (stack_id in (select id from hs_stacks where user_id = (select auth.uid())))
  with check (stack_id in (select id from hs_stacks where user_id = (select auth.uid())));

create policy "own habit_logs only" on hs_habit_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own reminders only" on hs_reminders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Indexing for performance
create index idx_hs_habits_user_id on hs_habits(user_id);
create index idx_hs_habit_logs_user_id on hs_habit_logs(user_id);
create index idx_hs_habit_logs_habit_id_date on hs_habit_logs(habit_id, log_date);
create index idx_hs_stacks_user_id on hs_stacks(user_id);

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
