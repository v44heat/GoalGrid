-- Phase 3: seasons, participants and team logos.

-- ---------- Team logo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "team logos public read" on storage.objects
  for select using (bucket_id = 'team-logos');

create policy "admin upload team logos" on storage.objects
  for insert with check (bucket_id = 'team-logos' and public.is_admin());

create policy "admin update team logos" on storage.objects
  for update using (bucket_id = 'team-logos' and public.is_admin());

create policy "admin delete team logos" on storage.objects
  for delete using (bucket_id = 'team-logos' and public.is_admin());

-- ---------- Create a season and its participants atomically ----------
-- SECURITY INVOKER (the default): Row Level Security still applies, so only an
-- approved admin can run this successfully. A season lasts exactly 30 days
-- (start date + 29 days, inclusive).
create or replace function create_season_with_participants(
  p_name     text,
  p_start    date,
  p_user_ids uuid[]
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_ids       uuid[];
  v_season_id uuid;
begin
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_user_ids) as x;

  if coalesce(array_length(v_ids, 1), 0) < 2 then
    raise exception 'TOO_FEW_PARTICIPANTS';
  end if;

  if exists (
    select 1 from unnest(v_ids) as u(id)
    left join users on users.id = u.id
    where users.id is null or users.status <> 'APPROVED'
  ) then
    raise exception 'PARTICIPANT_NOT_APPROVED';
  end if;

  insert into seasons (name, start_date, end_date)
  values (p_name, p_start, p_start + 29)
  returning id into v_season_id;

  insert into season_participants (season_id, user_id)
  select v_season_id, unnest(v_ids);

  return v_season_id;
end $$;
