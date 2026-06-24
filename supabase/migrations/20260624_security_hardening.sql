-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: close the user-data leak.
--
-- Audit (anon key) found `profiles` readable for ALL 47 users — email,
-- cash_balance, portfolio holdings, price_alerts. Cause: a permissive
-- policy `profiles_select_all` with USING (true) granted to public.
--
-- The app only ever reads its OWN row (.eq('id', user.id)), so we replace the
-- open SELECT with an own-row policy. Profile rows are created by the
-- SECURITY DEFINER signup trigger (which bypasses RLS), so signups are fine.
--
-- (daily_prices / daily_index / companies were checked too and are already
--  correct: RLS on, public-read-only, no write policy — left untouched.)
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles enable row level security; -- already on; harmless

-- Remove the open-to-everyone SELECT policy (the leak)
drop policy if exists "profiles_select_all" on profiles;

-- Own-row read; replace update policy to be authenticated-scoped & explicit
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check ((select auth.uid()) = id);

-- anon should not touch profiles at all
revoke all on profiles from anon;
-- NOTE: no DELETE policy → profile rows can't be deleted via the API.
-- NOTE: for a future public leaderboard, expose only safe columns (username,
--       points, streak) through a dedicated view — never reopen profiles.
