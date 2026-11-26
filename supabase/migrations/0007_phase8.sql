-- Phase 8: admin audit log, player score proposals, profile pictures.
-- Run AFTER 0006. Deploy this migration BEFORE the new app version: the app reads new columns.

-- =====================================================================
-- 1. Admin audit log
-- =====================================================================
-- Rows can only be created through log_admin_action() below, which stamps the real
-- signed-in admin as the actor. There are deliberately NO insert/update/delete policies,
-- so nobody can forge, edit or erase a log entry through the API.
create table admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id) on delete set null,
  actor_name  text not null,                       -- username at the time, kept even if the account changes
  action      text not null,                       -- e.g. 'result.update', 'player.approve'
  entity_type text not null,
  entity_id   uuid,
  summary     text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint admin_actions_entity_valid
    check (entity_type in ('player', 'team', 'season', 'participant', 'fixture', 'result'))
);
create index admin_actions_created_idx on admin_actions (created_at desc);
create index admin_actions_entity_idx  on admin_actions (entity_type, created_at desc);

alter table admin_actions enable row level security;
create policy "admins read audit log" on admin_actions
  for select using (public.is_admin());

create or replace function log_admin_action(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_summary     text,
  p_details     jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  select username into v_name from public.users where id = auth.uid();
  insert into public.admin_actions (actor_id, actor_name, action, entity_type, entity_id, summary, details)
  values (auth.uid(), coalesce(v_name, 'unknown'), p_action, p_entity_type, p_entity_id,
          left(p_summary, 500), coalesce(p_details, '{}'::jsonb));
end $$;

revoke execute on function log_admin_action(text, text, uuid, text, jsonb) from anon, public;
grant  execute on function log_admin_action(text, text, uuid, text, jsonb) to authenticated;

-- =====================================================================
-- 2. Player score proposals (admin approves)
-- =====================================================================
create type proposal_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'SUPERSEDED');

create table result_proposals (
  id            uuid primary key default gen_random_uuid(),
  fixture_id    uuid not null references fixtures(id) on delete cascade,
  submitted_by  uuid not null references users(id) on delete restrict,
  home_score    int  not null check (home_score between 0 and 99),
  away_score    int  not null check (away_score between 0 and 99),
  status        proposal_status not null default 'PENDING',
  decision_note text,
  decided_by    uuid references users(id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
-- At most one score can be waiting per match.
create unique index one_pending_proposal_per_fixture
  on result_proposals (fixture_id) where status = 'PENDING';
create index result_proposals_fixture_idx   on result_proposals (fixture_id);
create index result_proposals_submitter_idx on result_proposals (submitted_by, created_at desc);

alter table result_proposals enable row level security;

-- Visible to the two players in the match, whoever submitted it, and admins.
create policy "read own or admin proposals" on result_proposals
  for select using (
    public.is_admin()
    or submitted_by = auth.uid()
    or exists (
      select 1 from fixtures f
      where f.id = result_proposals.fixture_id
        and (f.home_player_id = auth.uid() or f.away_player_id = auth.uid())
    )
  );

-- A player can propose a score only for their own match, in an active season, while it has no result.
create policy "submit proposal for own match" on result_proposals
  for insert with check (
    submitted_by = auth.uid()
    and status = 'PENDING'
    and decided_by is null and decided_at is null and decision_note is null
    and exists (select 1 from users u where u.id = auth.uid() and u.status = 'APPROVED')
    and not exists (select 1 from match_results r where r.fixture_id = result_proposals.fixture_id)
    and exists (
      select 1 from fixtures f join seasons s on s.id = f.season_id
      where f.id = result_proposals.fixture_id
        and s.status = 'ACTIVE'
        and f.status in ('UPCOMING', 'POSTPONED')
        and (f.home_player_id = auth.uid() or f.away_player_id = auth.uid())
    )
  );

-- A player can withdraw their own pending proposal (and nothing else about it).
create policy "cancel own pending proposal" on result_proposals
  for update
  using (submitted_by = auth.uid() and status = 'PENDING')
  with check (submitted_by = auth.uid() and status = 'CANCELLED');

create policy "admins manage proposals" on result_proposals
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- record_match_result / delete_match_result: now also write the audit log
-- (with the old and new score) and settle any waiting proposal.
-- ---------------------------------------------------------------------
create or replace function record_match_result(p_fixture_id uuid, p_home int, p_away int)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_status        fixture_status;
  v_season        uuid;
  v_season_status season_status;
  v_matchday      int;
  v_home_id       uuid;
  v_away_id       uuid;
  v_existed       boolean;
  v_old_home      int;
  v_old_away      int;
  v_home_name     text;
  v_away_name     text;
begin
  if p_home is null or p_away is null
     or p_home < 0 or p_away < 0 or p_home > 99 or p_away > 99 then
    raise exception 'INVALID_SCORE';
  end if;

  select f.status, f.season_id, f.matchday, f.home_player_id, f.away_player_id
    into v_status, v_season, v_matchday, v_home_id, v_away_id
  from fixtures f where f.id = p_fixture_id
  for update;
  if not found then raise exception 'FIXTURE_NOT_FOUND'; end if;

  select s.status into v_season_status from seasons s where s.id = v_season;
  if v_season_status <> 'ACTIVE' then raise exception 'SEASON_NOT_ACTIVE'; end if;
  if v_status = 'CANCELLED' then raise exception 'FIXTURE_CANCELLED'; end if;

  select r.home_score, r.away_score into v_old_home, v_old_away
  from match_results r where r.fixture_id = p_fixture_id;
  v_existed := found;

  insert into match_results (fixture_id, home_score, away_score)
  values (p_fixture_id, p_home, p_away)
  on conflict (fixture_id)
  do update set home_score = excluded.home_score, away_score = excluded.away_score;

  update fixtures set status = 'PLAYED' where id = p_fixture_id;

  -- A result recorded by an admin replaces any score a player was waiting on.
  update result_proposals
     set status = 'SUPERSEDED', decided_by = auth.uid(), decided_at = now()
   where fixture_id = p_fixture_id and status = 'PENDING';

  select h.username, a.username into v_home_name, v_away_name
  from users h, users a where h.id = v_home_id and a.id = v_away_id;

  perform log_admin_action(
    case when v_existed then 'result.update' else 'result.save' end,
    'result',
    p_fixture_id,
    case when v_existed
      then format('Corrected %s %s-%s %s (was %s-%s)',
                  coalesce(v_home_name, '?'), p_home, p_away, coalesce(v_away_name, '?'), v_old_home, v_old_away)
      else format('Recorded %s %s-%s %s (matchday %s)',
                  coalesce(v_home_name, '?'), p_home, p_away, coalesce(v_away_name, '?'), v_matchday)
    end,
    jsonb_build_object(
      'fixture_id', p_fixture_id, 'home_score', p_home, 'away_score', p_away,
      'old_home_score', v_old_home, 'old_away_score', v_old_away
    )
  );

  return case when v_existed then 'UPDATED' else 'CREATED' end;
end $$;

create or replace function delete_match_result(p_fixture_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_season        uuid;
  v_season_status season_status;
  v_home_id       uuid;
  v_away_id       uuid;
  v_old_home      int;
  v_old_away      int;
  v_home_name     text;
  v_away_name     text;
begin
  select f.season_id, f.home_player_id, f.away_player_id
    into v_season, v_home_id, v_away_id
  from fixtures f where f.id = p_fixture_id for update;
  if not found then raise exception 'FIXTURE_NOT_FOUND'; end if;

  select s.status into v_season_status from seasons s where s.id = v_season;
  if v_season_status <> 'ACTIVE' then raise exception 'SEASON_NOT_ACTIVE'; end if;

  select r.home_score, r.away_score into v_old_home, v_old_away
  from match_results r where r.fixture_id = p_fixture_id;

  delete from match_results where fixture_id = p_fixture_id;
  if not found then raise exception 'RESULT_NOT_FOUND'; end if;

  update fixtures set status = 'UPCOMING' where id = p_fixture_id;

  select h.username, a.username into v_home_name, v_away_name
  from users h, users a where h.id = v_home_id and a.id = v_away_id;

  perform log_admin_action(
    'result.delete', 'result', p_fixture_id,
    format('Deleted result %s %s-%s %s', coalesce(v_home_name, '?'), v_old_home, v_old_away, coalesce(v_away_name, '?')),
    jsonb_build_object('fixture_id', p_fixture_id, 'old_home_score', v_old_home, 'old_away_score', v_old_away)
  );
end $$;

-- ---------------------------------------------------------------------
-- Approving a proposal records the result. The admin may change the score first.
-- ---------------------------------------------------------------------
create or replace function approve_result_proposal(p_proposal_id uuid, p_home int default null, p_away int default null)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_p         result_proposals%rowtype;
  v_home      int;
  v_away      int;
  v_adjusted  boolean;
  v_outcome   text;
  v_home_name text;
  v_away_name text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  select * into v_p from result_proposals where id = p_proposal_id for update;
  if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if v_p.status <> 'PENDING' then raise exception 'PROPOSAL_NOT_PENDING'; end if;

  v_home := coalesce(p_home, v_p.home_score);
  v_away := coalesce(p_away, v_p.away_score);
  v_adjusted := (v_home <> v_p.home_score or v_away <> v_p.away_score);

  update result_proposals
     set status = 'APPROVED',
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = case when v_adjusted
           then format('Admin adjusted the score from %s-%s to %s-%s', v_p.home_score, v_p.away_score, v_home, v_away)
           else null end
   where id = p_proposal_id;

  v_outcome := record_match_result(v_p.fixture_id, v_home, v_away);

  select h.username, a.username into v_home_name, v_away_name
  from fixtures f
  join users h on h.id = f.home_player_id
  join users a on a.id = f.away_player_id
  where f.id = v_p.fixture_id;

  perform log_admin_action(
    'proposal.approve', 'result', v_p.fixture_id,
    format('Approved score for %s %s-%s %s%s',
           coalesce(v_home_name, '?'), v_home, v_away, coalesce(v_away_name, '?'),
           case when v_adjusted then format(' (adjusted from %s-%s)', v_p.home_score, v_p.away_score) else '' end),
    jsonb_build_object('proposal_id', p_proposal_id, 'submitted', format('%s-%s', v_p.home_score, v_p.away_score),
                       'approved', format('%s-%s', v_home, v_away), 'adjusted', v_adjusted)
  );

  return v_outcome;
end $$;

create or replace function reject_result_proposal(p_proposal_id uuid, p_note text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_p         result_proposals%rowtype;
  v_home_name text;
  v_away_name text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;

  select * into v_p from result_proposals where id = p_proposal_id for update;
  if not found then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if v_p.status <> 'PENDING' then raise exception 'PROPOSAL_NOT_PENDING'; end if;

  update result_proposals
     set status = 'REJECTED',
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = nullif(left(trim(coalesce(p_note, '')), 300), '')
   where id = p_proposal_id;

  select h.username, a.username into v_home_name, v_away_name
  from fixtures f
  join users h on h.id = f.home_player_id
  join users a on a.id = f.away_player_id
  where f.id = v_p.fixture_id;

  perform log_admin_action(
    'proposal.reject', 'result', v_p.fixture_id,
    format('Rejected score %s %s-%s %s', coalesce(v_home_name, '?'), v_p.home_score, v_p.away_score, coalesce(v_away_name, '?')),
    jsonb_build_object('proposal_id', p_proposal_id, 'submitted', format('%s-%s', v_p.home_score, v_p.away_score),
                       'note', nullif(left(trim(coalesce(p_note, '')), 300), ''))
  );
end $$;

-- =====================================================================
-- 3. Profile pictures
-- =====================================================================
-- Only the storage PATH is stored ('<user id>/<file>.jpg'), never a URL, so a profile picture can
-- never point at somebody else's website. The app builds the public URL from the project URL.
alter table users add column avatar_path text;
alter table users add constraint avatar_path_shape
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}\.jpg$');

-- Players have no UPDATE policy on users (that would let them edit their own role and status),
-- so they change their picture through this function, which can touch nothing else.
create or replace function set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_path is not null and p_path !~ ('^' || auth.uid()::text || '/[A-Za-z0-9._-]{1,80}\.jpg$') then
    raise exception 'INVALID_AVATAR_PATH';
  end if;
  update public.users set avatar_path = p_path where id = auth.uid() and status = 'APPROVED';
end $$;

revoke execute on function set_my_avatar(text) from anon, public;
grant  execute on function set_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 307200, array['image/jpeg'])
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Each player can write only inside their own folder.
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
