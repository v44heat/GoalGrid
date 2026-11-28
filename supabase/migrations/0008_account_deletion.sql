-- Phase 9: permanent account deletion.
-- Run AFTER 0007. Deploy this migration BEFORE the new app version.
--
-- What "delete my account" means here:
--   * Everything personal is erased: login, email, password, profile picture and username.
--   * Matches the player took part in stay in the league records, so everyone else's results,
--     tables and past champions stay correct. They show as "Deleted player xxxxxx".
--   * A player with no league history at all is removed completely.
-- Deleting the login account (auth.users) triggers the erasure below IN THE SAME TRANSACTION, so
-- there is no half-deleted state: either both happen or neither does.

-- ---------------------------------------------------------------------
-- 1. Schema changes
-- ---------------------------------------------------------------------
alter table users add column deleted_at timestamptz;

-- Deleted players get a readable placeholder name (with a space), which the old rule forbade.
-- Real players still have to follow the original rule.
alter table users drop constraint username_format;
alter table users add constraint username_format
  check (deleted_at is not null or username ~ '^[A-Za-z0-9_]{3,20}$');

-- users.id used to cascade from auth.users. That would delete the profile row (and be blocked by
-- the league history) when the login account is removed. The profile row is now independent:
-- the erasure function below decides what happens to it. The constraint is found by what it
-- points at, not by its name, so this works whatever it was called.
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.users'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.users drop constraint %I', c);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. The erasure itself
-- ---------------------------------------------------------------------
create or replace function erase_player(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_name     text;
  v_role         user_role;
  v_status       user_status;
  v_deleted_at   timestamptz;
  v_new_name     text;
  v_has_history  boolean;
  v_seasons      int;
  v_ongoing      boolean;
  v_other_admins int;
begin
  select username, role, status, deleted_at
    into v_old_name, v_role, v_status, v_deleted_at
  from users where id = p_user_id
  for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_deleted_at is not null then return jsonb_build_object('status', 'already_erased'); end if;

  -- Never remove the last working admin: nobody could run the league afterwards.
  if v_role = 'ADMIN' and v_status = 'APPROVED' then
    select count(*) into v_other_admins
    from users
    where role = 'ADMIN' and status = 'APPROVED' and deleted_at is null and id <> p_user_id;
    if v_other_admins = 0 then raise exception 'LAST_ADMIN'; end if;
  end if;

  -- 1. Leave seasons that have not started and have no fixtures yet, so the admin never
  --    generates fixtures that include a ghost.
  delete from season_participants as sp
  using seasons as s
  where sp.user_id = p_user_id
    and s.id = sp.season_id
    and s.status = 'DRAFT'
    and not exists (select 1 from fixtures f where f.season_id = s.id);

  -- 2. Withdraw any score they had waiting for approval.
  update result_proposals
     set status = 'CANCELLED', decided_at = now()
   where submitted_by = p_user_id and status = 'PENDING';

  select exists (select 1 from season_participants where user_id = p_user_id)
      or exists (select 1 from fixtures where home_player_id = p_user_id or away_player_id = p_user_id)
    into v_has_history;
  select count(*) into v_seasons from season_participants where user_id = p_user_id;
  select exists (
           select 1 from season_participants sp join seasons s on s.id = sp.season_id
           where sp.user_id = p_user_id and s.status in ('DRAFT', 'ACTIVE')
         ) into v_ongoing;

  -- 3. Scrub the username out of the admin audit log. Whole words only, case-insensitive, and
  --    only in text columns. JSON is never rewritten as text (a name like "true" or "1234" would
  --    corrupt it); the one JSON field that can hold a name is removed by key instead.
  update admin_actions
     set summary    = regexp_replace(summary, '\m' || v_old_name || '\M', 'Deleted player', 'gi'),
         actor_name = case when actor_id = p_user_id then 'Deleted player' else actor_name end,
         details    = case when lower(details ->> 'username') = lower(v_old_name)
                           then details - 'username' else details end
   where summary ~* ('\m' || v_old_name || '\M')
      or actor_id = p_user_id
      or lower(details ->> 'username') = lower(v_old_name);

  -- 4. Keep an anonymous shell if they have league history, otherwise remove them completely.
  if v_has_history then
    v_new_name := 'Deleted player ' || substr(md5(p_user_id::text || clock_timestamp()::text), 1, 6);
    update users
       set username = v_new_name,
           avatar_path = null,
           role = 'PLAYER',
           status = 'SUSPENDED',
           deleted_at = now()
     where id = p_user_id;
  else
    delete from users where id = p_user_id;
  end if;

  -- 5. Tell the admins, without naming the person.
  insert into admin_actions (actor_id, actor_name, action, entity_type, entity_id, summary, details)
  values (
    case when v_has_history then p_user_id end,
    'Deleted player',
    'player.self_delete',
    'player',
    case when v_has_history then p_user_id end,
    case when v_has_history
      then format('A player deleted their account. Their matches stay in %s season(s) as "Deleted player"%s',
                  v_seasons,
                  case when v_ongoing
                    then '. A season they were in is still running, so check their remaining matches'
                    else '' end)
      else 'A player with no league history deleted their account. Everything about them was removed'
    end,
    jsonb_build_object('seasons', v_seasons, 'ongoing', v_ongoing, 'removed_completely', not v_has_history)
  );

  return jsonb_build_object('status', 'erased', 'removed_completely', not v_has_history);
end $$;

-- Only the server (service role) and the trigger below may run it. Never a player, never the public.
revoke execute on function erase_player(uuid) from public, anon, authenticated;
grant  execute on function erase_player(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 3. Deleting a login account erases the player, in the same transaction
-- ---------------------------------------------------------------------
-- This also covers an account deleted by hand from the Supabase dashboard, and means a failure
-- (for example the last admin) cancels the whole deletion instead of leaving half of it done.
create or replace function handle_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.erase_player(old.id);
  return old;
end $$;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function handle_deleted_auth_user();
