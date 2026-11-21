-- Phase 4: fixture generation.

-- ---------- Generate all fixtures for a season atomically ----------
-- SECURITY INVOKER: Row Level Security applies, so only an approved admin can write.
-- The generator runs in the app; this function re-validates everything it is given,
-- so a bad or forged payload can never produce an invalid fixture list.
-- p_fixtures: [{ "matchday": 1, "home": "<uuid>", "away": "<uuid>", "scheduled_date": "2026-12-01" }, ...]
create or replace function generate_season_fixtures(p_season_id uuid, p_fixtures jsonb)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_status   season_status;
  v_start    date;
  v_end      date;
  v_players  int;
  v_inserted int;
begin
  select status, start_date, end_date into v_status, v_start, v_end
  from seasons where id = p_season_id;

  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if v_status <> 'DRAFT' then raise exception 'SEASON_NOT_DRAFT'; end if;
  if exists (select 1 from fixtures where season_id = p_season_id) then
    raise exception 'FIXTURES_EXIST';
  end if;

  select count(*) into v_players from season_participants where season_id = p_season_id;
  if v_players < 2 then raise exception 'TOO_FEW_PARTICIPANTS'; end if;

  if jsonb_typeof(p_fixtures) <> 'array'
     or jsonb_array_length(p_fixtures) <> v_players * (v_players - 1) then
    raise exception 'BAD_FIXTURE_COUNT';
  end if;

  -- Every named player must be a participant of this season.
  if exists (
    select 1
    from jsonb_to_recordset(p_fixtures) as f(home uuid, away uuid)
    where not exists (select 1 from season_participants sp where sp.season_id = p_season_id and sp.user_id = f.home)
       or not exists (select 1 from season_participants sp where sp.season_id = p_season_id and sp.user_id = f.away)
  ) then
    raise exception 'NOT_PARTICIPANT';
  end if;

  -- A player may appear at most once per matchday.
  if exists (
    with rs as (
      select * from jsonb_to_recordset(p_fixtures) as f(matchday int, home uuid, away uuid)
    )
    select 1
    from (
      select matchday, home as player from rs
      union all
      select matchday, away from rs
    ) x
    group by matchday, player
    having count(*) > 1
  ) then
    raise exception 'PLAYER_TWICE_IN_MATCHDAY';
  end if;

  -- Every date must fall inside the season.
  if exists (
    select 1
    from jsonb_to_recordset(p_fixtures) as f(scheduled_date date)
    where f.scheduled_date is null or f.scheduled_date < v_start or f.scheduled_date > v_end
  ) then
    raise exception 'DATE_OUTSIDE_SEASON';
  end if;

  -- unique_pairing_per_season (season, home, away) rejects any duplicate pairing.
  insert into fixtures (season_id, matchday, home_player_id, away_player_id, scheduled_date)
  select p_season_id, f.matchday, f.home, f.away, f.scheduled_date
  from jsonb_to_recordset(p_fixtures) as f(matchday int, home uuid, away uuid, scheduled_date date);

  get diagnostics v_inserted = row_count;
  return v_inserted;
end $$;

-- ---------- Lock the participant list once fixtures exist ----------
-- Adding or removing a player would invalidate the fixture list. Team changes are UPDATEs
-- and stay allowed.
create or replace function block_participant_change_after_fixtures()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_season uuid;
begin
  if tg_op = 'DELETE' then
    v_season := old.season_id;
  else
    v_season := new.season_id;
  end if;

  -- The season check keeps cascading deletes of a whole season working.
  if exists (select 1 from seasons where id = v_season)
     and exists (select 1 from fixtures where season_id = v_season) then
    raise exception 'FIXTURES_EXIST';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger season_participants_lock_after_fixtures
  before insert or delete on season_participants
  for each row execute function block_participant_change_after_fixtures();

create index if not exists fixtures_season_status_idx on fixtures (season_id, status);
