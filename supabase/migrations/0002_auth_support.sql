-- Phase 2: authentication support.
-- Emails live in Supabase Auth (auth.users), NOT in the publicly readable users table.

-- Case-insensitive username lookup used by the login action.
alter table users
  add column username_lower text generated always as (lower(username)) stored;

create index users_status_idx on users (status);
