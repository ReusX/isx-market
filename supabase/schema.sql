-- ISX Market — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor

-- ── profiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text,
  username              text unique,
  referral_code         text unique,
  referred_by           uuid references public.profiles(id),
  points                integer not null default 0,
  streak                integer not null default 0,
  last_login_date       date,
  spin_cooldown_ends_at timestamptz,
  cash_balance          bigint not null default 10000000,  -- 10M IQD virtual cash
  watchlist             text[] default '{}',
  created_at            timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Leaderboard readable by all"
  on public.profiles for select using (true);

-- ── holdings ──────────────────────────────────────────────────────────────
create table if not exists public.holdings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  sym        text not null,
  qty        integer not null check (qty > 0),
  avg_price  numeric(10,4) not null,
  created_at timestamptz default now(),
  unique(user_id, sym)
);

alter table public.holdings enable row level security;
create policy "Users manage own holdings"
  on public.holdings for all using (auth.uid() = user_id);

-- ── transactions ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,  -- 'buy' | 'sell' | 'spin' | 'deposit' | 'referral' | 'bonus'
  sym        text,
  qty        integer,
  amount     numeric(14,2) not null default 0,
  notes      text,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Users read own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Service role inserts transactions"
  on public.transactions for insert with check (true);

-- ── referrals ─────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(referred_id)
);

alter table public.referrals enable row level security;
create policy "Users read own referrals"
  on public.referrals for select using (auth.uid() = referrer_id);

-- ── wallet_requests ───────────────────────────────────────────────────────
create table if not exists public.wallet_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,  -- 'deposit' | 'withdrawal'
  amount     numeric(14,2) not null,
  status     text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  notes      text,
  created_at timestamptz default now()
);

alter table public.wallet_requests enable row level security;
create policy "Users manage own wallet requests"
  on public.wallet_requests for all using (auth.uid() = user_id);

-- ── Trigger: auto-create profile on signup ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, username, referral_code, points, streak, cash_balance)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    upper(substring(md5(new.id::text), 1, 6)),
    1000,   -- welcome bonus
    0,
    10000000
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_holdings_user    on public.holdings(user_id);
create index if not exists idx_tx_user          on public.transactions(user_id, created_at desc);
create index if not exists idx_profiles_points  on public.profiles(points desc);
create index if not exists idx_profiles_refcode on public.profiles(referral_code);
