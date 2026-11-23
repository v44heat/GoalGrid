-- Phase 7: database hardening.

-- ---------- 1. Stop leaking unapproved accounts ----------
-- Until now anyone could list every row of `users`, including PENDING registrations and
-- suspended accounts. Now the public can see only approved players, plus anyone who has
-- ever taken part in a season (so past standings and history keep their names).
-- You always see your own row; admins keep full access through "admin write users".
drop policy if exists "read users" on users;
create policy "read users" on users for select using (
  status = 'APPROVED'
  or id = auth.uid()
  or exists (select 1 from season_participants sp where sp.user_id = users.id)
);

-- ---------- 2. Season status can only move along the allowed path ----------
--   DRAFT -> ACTIVE -> COMPLETED -> ARCHIVED, plus COMPLETED -> ACTIVE (reopen after a mistake).
-- Starting a season also requires fixtures and a team for every player, enforced here
-- as a backstop in case a future code path forgets to check.
create or replace function enforce_season_status_flow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status = 'DRAFT' and new.status = 'ACTIVE' then
    if not exists (select 1 from fixtures where season_id = new.id) then
      raise exception 'NO_FIXTURES';
    end if;
    if exists (select 1 from season_participants where season_id = new.id and team_id is null) then
      raise exception 'TEAMS_MISSING';
    end if;
    return new;
  elsif old.status = 'ACTIVE' and new.status = 'COMPLETED' then
    return new;
  elsif old.status = 'COMPLETED' and new.status in ('ACTIVE', 'ARCHIVED') then
    return new;
  end if;

  raise exception 'INVALID_SEASON_TRANSITION';
end $$;

create trigger seasons_status_flow
  before update of status on seasons
  for each row execute function enforce_season_status_flow();

-- ---------- 3. Finished seasons can never be deleted ----------
-- Deleting a season would cascade away its fixtures and results.
create or replace function protect_finished_seasons()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('COMPLETED', 'ARCHIVED') then
    raise exception 'SEASON_PROTECTED';
  end if;
  return old;
end $$;

create trigger seasons_protect_delete
  before delete on seasons
  for each row execute function protect_finished_seasons();
