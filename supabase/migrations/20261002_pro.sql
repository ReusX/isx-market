-- «IQWealth برو» · paid passes sold through Wayl (lib/pro.ts, app/api/pro/*).
--
-- Wayl has no recurring billing, so a purchase is a time pass: each paid
-- order adds its days to the user's pro_until. Clients may only READ their
-- own rows; every write goes through the service role, and the one write
-- that grants time (pro_mark_paid) is idempotent per order so a replayed or
-- duplicated webhook can never add the days twice.

create table if not exists public.pro_orders (
  id            uuid primary key default gen_random_uuid(),
  reference_id  text not null unique,              -- what Wayl knows the order by
  user_id       uuid not null references auth.users (id) on delete cascade,
  plan          text not null check (plan in ('month', 'year')),
  days          int  not null check (days > 0),
  amount_iqd    int  not null check (amount_iqd > 0),
  env           text not null check (env in ('test', 'live')),
  status        text not null default 'created',   -- Wayl's status, lower-cased
  pay_url       text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index if not exists pro_orders_user on public.pro_orders (user_id, created_at desc);

create table if not exists public.pro_entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pro_until  timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.pro_orders enable row level security;
alter table public.pro_entitlements enable row level security;

drop policy if exists "own orders" on public.pro_orders;
create policy "own orders" on public.pro_orders for select to authenticated using (user_id = auth.uid());
drop policy if exists "own pass" on public.pro_entitlements;
create policy "own pass" on public.pro_entitlements for select to authenticated using (user_id = auth.uid());

revoke all on public.pro_orders, public.pro_entitlements from anon;
revoke insert, update, delete on public.pro_orders, public.pro_entitlements from authenticated;
grant select on public.pro_orders, public.pro_entitlements to authenticated;

-- Mark an order paid and extend the pass, once. Returns the new pro_until,
-- or null when the order was already paid (or does not exist).
create or replace function public.pro_mark_paid(ref text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.pro_orders;
  until timestamptz;
begin
  update public.pro_orders
     set status = 'complete', paid_at = now()
   where reference_id = ref and paid_at is null
  returning * into o;
  if not found then return null; end if;

  insert into public.pro_entitlements as e (user_id, pro_until, updated_at)
  values (o.user_id, now() + make_interval(days => o.days), now())
  on conflict (user_id) do update
     set pro_until = greatest(e.pro_until, now()) + make_interval(days => o.days),
         updated_at = now()
  returning pro_until into until;
  return until;
end;
$$;

revoke all on function public.pro_mark_paid(text) from public, anon, authenticated;
grant execute on function public.pro_mark_paid(text) to service_role;
