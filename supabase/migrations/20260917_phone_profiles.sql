-- Phone sign-ups have no email: the profile trigger derived the username
-- from the address and violated NOT NULL. Derive it from whichever
-- identity exists — the local part of the email, or «user» + the last
-- four digits of the phone — and on a username collision (the column is
-- UNIQUE) fall back to an id-based handle. Account creation never fails
-- over a display name; the reader can rename on /profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  preferred text;
  fallback  text;
begin
  preferred := coalesce(
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    case when new.phone is not null then 'user' || right(new.phone, 4) else null end
  );
  fallback := 'user' || upper(substring(md5(new.id::text), 1, 6));
  begin
    insert into public.profiles (id, email, username, referral_code, points, streak, cash_balance)
    values (new.id, new.email, coalesce(preferred, fallback), upper(substring(md5(new.id::text), 1, 6)), 1000, 0, 10000000)
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, email, username, referral_code, points, streak, cash_balance)
    values (new.id, new.email, fallback, upper(substring(md5(new.id::text), 1, 6)), 1000, 0, 10000000)
    on conflict (id) do nothing;
  end;
  return new;
end;
$function$;
