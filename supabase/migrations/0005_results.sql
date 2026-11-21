-- Phase 5: match results.
-- Standings are NOT stored anywhere. They are calculated from match_results.

-- Record, or correct, the result of a fixture. Returns 'CREATED' or 'UPDATED'.
-- One call does everything: it upserts the single result row (fixture_id is UNIQUE, so a
-- fixture can never have two results) and marks the fixture PLAYED. SECURITY INVOKER, so
-- Row Level Security still applies and only an approved admin can succeed.
create or replace function record_match_result(p_fixture_id uuid, p_home int, p_away int)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_status        fixture_status;
  v_season        uuid;
  v_season_status season_status;
  v_existed       boolean;
begin
  if p_home is null or p_away is null
     or p_home < 0 or p_away < 0 or p_home > 99 or p_away > 99 then
    raise exception 'INVALID_SCORE';
  end if;

  select f.status, f.season_id into v_status, v_season
  from fixtures f where f.id = p_fixture_id
  for update;
  if not found then raise exception 'FIXTURE_NOT_FOUND'; end if;

  select s.status into v_season_status from seasons s where s.id = v_season;
  if v_season_status <> 'ACTIVE' then raise exception 'SEASON_NOT_ACTIVE'; end if;
  if v_status = 'CANCELLED' then raise exception 'FIXTURE_CANCELLED'; end if;

  select exists (select 1 from match_results where fixture_id = p_fixture_id) into v_existed;

  insert into match_results (fixture_id, home_score, away_score)
  values (p_fixture_id, p_home, p_away)
  on conflict (fixture_id)
  do update set home_score = excluded.home_score, away_score = excluded.away_score;

  update fixtures set status = 'PLAYED' where id = p_fixture_id;

  return case when v_existed then 'UPDATED' else 'CREATED' end;
end $$;

-- Remove a result. The fixture goes back to UPCOMING, and the standings follow automatically.
create or replace function delete_match_result(p_fixture_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_season        uuid;
  v_season_status season_status;
begin
  select f.season_id into v_season from fixtures f where f.id = p_fixture_id for update;
  if not found then raise exception 'FIXTURE_NOT_FOUND'; end if;

  select s.status into v_season_status from seasons s where s.id = v_season;
  if v_season_status <> 'ACTIVE' then raise exception 'SEASON_NOT_ACTIVE'; end if;

  delete from match_results where fixture_id = p_fixture_id;
  if not found then raise exception 'RESULT_NOT_FOUND'; end if;

  update fixtures set status = 'UPCOMING' where id = p_fixture_id;
end $$;
