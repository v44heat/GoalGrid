-- eFootball League Manager: initial schema (Phase 1)
-- Run in Supabase > SQL Editor.

-- ---------- Enums ----------
create type user_role      as enum ('ADMIN', 'PLAYER');
create type user_status    as enum ('PENDING', 'APPROVED', 'SUSPENDED');
create type season_status  as enum ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
create type fixture_status as enum ('UPCOMING', 'PLAYED', 'POSTPONED', 'CANCELLED');

-- ---------- Helpers ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- users (profile row for each auth account) ----------
-- Passwords are never stored here; Supabase Auth keeps the hash in auth.users.
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  role        user_role   not null default 'PLAYER',
  status      user_status not null default 'PENDING',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);
create unique index users_username_lower_key on users (lower(username));
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- Create the profile automatically when an auth account is created.
-- Role and status are ALWAYS forced to PLAYER / PENDING here, so a client
-- can never sign itself up as an admin through user metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, role, status)
  values (new.id, new.raw_user_meta_data ->> 'username', 'PLAYER', 'PENDING');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'ADMIN' and status = 'APPROVED'
  );
$$;

-- ---------- teams ----------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text not null,
  logo_url    text,
  created_at  timestamptz not null default now()
);
create unique index teams_name_lower_key on teams (lower(name));

-- ---------- seasons ----------
create table seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  status      season_status not null default 'DRAFT',
  created_at  timestamptz not null default now(),
  constraint season_dates_valid check (end_date > start_date)
);
-- Only one ACTIVE season at a time.
create unique index one_active_season on seasons (status) where status = 'ACTIVE';

-- ---------- season_participants ----------
create table season_participants (
  id         uuid primary key default gen_random_uuid(),
  season_id  uuid not null references seasons(id) on delete cascade,
  user_id    uuid not null references users(id)   on delete restrict,
  team_id    uuid references teams(id)            on delete restrict,
  created_at timestamptz not null default now(),
  constraint one_entry_per_user_per_season unique (season_id, user_id),
  constraint one_team_per_season           unique (season_id, team_id)
);
-- NULL team_id values are allowed to repeat (unique ignores NULLs), so players
-- can be added to a season before they have picked a club.
create index season_participants_user_idx on season_participants (user_id);

-- ---------- fixtures ----------
create table fixtures (
  id              uuid primary key default gen_random_uuid(),
  season_id       uuid not null references seasons(id) on delete cascade,
  matchday        int  not null check (matchday > 0),
  home_player_id  uuid not null references users(id) on delete restrict,
  away_player_id  uuid not null references users(id) on delete restrict,
  scheduled_date  date not null,
  status          fixture_status not null default 'UPCOMING',
  constraint home_not_away check (home_player_id <> away_player_id),
  -- A given home/away pairing can only exist once per season (blocks duplicate generation).
  constraint unique_pairing_per_season unique (season_id, home_player_id, away_player_id)
);
create index fixtures_season_matchday_idx on fixtures (season_id, matchday);
create index fixtures_home_idx on fixtures (home_player_id);
create index fixtures_away_idx on fixtures (away_player_id);

-- ---------- match_results ----------
-- Standings are derived from this table; no points are ever stored.
create table match_results (
  id           uuid primary key default gen_random_uuid(),
  fixture_id   uuid not null unique references fixtures(id) on delete cascade,
  home_score   int  not null check (home_score between 0 and 99),
  away_score   int  not null check (away_score between 0 and 99),
  recorded_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger match_results_updated_at before update on match_results
  for each row execute function set_updated_at();

-- ---------- Row Level Security ----------
alter table users               enable row level security;
alter table teams               enable row level security;
alter table seasons             enable row level security;
alter table season_participants enable row level security;
alter table fixtures            enable row level security;
alter table match_results       enable row level security;

-- League data is public to read (the dashboard is viewable by friends without logging in).
create policy "read users"        on users               for select using (true);
create policy "read teams"        on teams               for select using (true);
create policy "read seasons"      on seasons             for select using (true);
create policy "read participants" on season_participants for select using (true);
create policy "read fixtures"     on fixtures            for select using (true);
create policy "read results"      on match_results       for select using (true);

-- Only approved admins can write. Players have NO write policies: team selection
-- and registration run through server-side code that validates the rules (Phases 2-3).
create policy "admin write users"        on users               for all using (is_admin()) with check (is_admin());
create policy "admin write teams"        on teams               for all using (is_admin()) with check (is_admin());
create policy "admin write seasons"      on seasons             for all using (is_admin()) with check (is_admin());
create policy "admin write participants" on season_participants for all using (is_admin()) with check (is_admin());
create policy "admin write fixtures"     on fixtures            for all using (is_admin()) with check (is_admin());
create policy "admin write results"      on match_results       for all using (is_admin()) with check (is_admin());
