-- Profiles: a signed-in user may edit only the columns the site writes.
-- RLS already limits them to their own row, but without column grants they
-- could set points, cash_balance, is_og, user_number, email or referred_by on
-- it. Rows are created by the handle_new_user trigger (security definer), so
-- clients need no INSERT at all.
revoke insert, update on public.profiles from anon, authenticated;
grant update (username, watchlist, portfolio, price_alerts) on public.profiles to authenticated;
