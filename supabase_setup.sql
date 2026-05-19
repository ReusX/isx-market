-- ═══════════════════════════════════════════════════════════════
-- ISX Market — Supabase Database Setup
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  user_number integer,
  is_og       boolean default false,
  watchlist   text[]  default '{}',
  created_at  timestamptz default now()
);

-- 2. SEQUENCE for user numbers (determines OG status)
create sequence if not exists public.user_number_seq start 1;

-- 3. ROW-LEVEL SECURITY
alter table public.profiles enable row level security;

-- Anyone can read profiles (needed for username-taken check)
create policy "Public read profiles"
  on public.profiles for select
  using (true);

-- Users can only update their own row
create policy "Self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4. AUTO-CREATE PROFILE ON SIGNUP
--    Reads username from signUp({ options: { data: { username } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  num integer;
begin
  num := nextval('public.user_number_seq');
  insert into public.profiles (id, username, user_number, is_og)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    num,
    num <= 200   -- first 200 users get OG badge
  );
  return new;
end;
$$;

-- Drop trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════
-- DONE. Now go to:
--   Authentication → Settings → Email confirmation
--   → Disable "Enable email confirmations" during development
--     (re-enable before going live with real users)
-- ═══════════════════════════════════════════════════════════════
