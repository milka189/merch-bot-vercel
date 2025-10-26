-- Users: Telegram ↔ route
create table if not exists users (
  telegram_id bigint primary key,
  route_code text not null,
  created_at timestamptz default now()
);

-- Trade points (TT)
create table if not exists tts (
  id bigserial primary key,
  tt_code text,
  network text,
  address text not null,
  unique (tt_code, address)
);

-- Weekly targets (4-week period)
create table if not exists weekly_targets (
  route_code text not null,
  tt_id bigint references tts(id) on delete cascade,
  week smallint not null check (week between 1 and 4),
  target integer not null check (target >= 0),
  primary key (route_code, tt_id, week)
);

-- Progress per merch
create table if not exists progress (
  telegram_id bigint references users(telegram_id) on delete cascade,
  tt_id bigint references tts(id) on delete cascade,
  week smallint not null check (week between 1 and 4),
  done integer not null default 0 check (done >= 0),
  primary key (telegram_id, tt_id, week)
);

-- Settings kv
create table if not exists settings (
  key text primary key,
  value text
);

-- Period start (YYYY-MM-DD)
insert into settings(key, value)
  values ('period_start', '2025-01-01')
  on conflict (key) do nothing;

-- Staging for CSV
create table if not exists ap_stage (
  route_code text,
  tt_code text,
  network text,
  address text,
  w1 int, w2 int, w3 int, w4 int
);

-- Helpful indexes
create index if not exists idx_weekly_targets_route_week on weekly_targets (route_code, week);
create index if not exists idx_progress_user_week on progress (telegram_id, week);
