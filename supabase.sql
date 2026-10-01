-- KO Basket - hasierako eskema
-- Lehen lehiaketa: Bigarren Nazionala Gizonezkoak

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_deadline timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists competition_participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (competition_id, user_id)
);

-- Taldeak lehiaketaren barruko entitate independenteak dira.
-- Izen bera beste lehiaketa batean ager daiteke eta beste talde bat izango da.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (competition_id, name)
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  pick_deadline timestamptz not null,
  results_deadline timestamptz not null,
  counts_for_ko boolean not null default true,
  status text not null default 'open' check (status in ('open','picks_closed','results_pending','completed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (competition_id, round_number)
);

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, user_id),
  unique (competition_id, user_id, team_id)
);

create table if not exists round_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  result text not null default 'pending' check (result in ('pending','won','lost')),
  updated_at timestamptz not null default now(),
  unique (round_id, team_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  competition_id uuid not null references competitions(id) on delete cascade,
  round_id uuid references rounds(id) on delete cascade,
  type text not null check (type in ('survived','eliminated','info')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Hasierako lehiaketa sortzeko adibidea.
-- Aldatu data benetako izen-emate epera.
insert into competitions (name, registration_deadline)
select 'Bigarren Nazionala Gizonezkoak', '2026-10-02 17:00:00+02'
where not exists (
  select 1 from competitions where name = 'Bigarren Nazionala Gizonezkoak'
);
