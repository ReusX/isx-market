-- ISX monthly-report pipeline schema (run once in the Supabase SQL editor)

create table if not exists companies (
  ticker   text primary key,
  name_en  text,
  name_ar  text,
  sector   text
);

create table if not exists monthly_prices (
  ticker        text not null references companies(ticker),
  year          int  not null,
  month         int  not null check (month between 1 and 12),
  open          numeric,
  high          numeric,
  low           numeric,
  close         numeric,
  avg_price     numeric,
  prev_close    numeric,
  change_pct    numeric,
  volume        numeric,
  value         numeric,
  trades        numeric,
  trading_days  int,
  primary key (ticker, year, month)
);

create table if not exists daily_index (
  date              date primary key,
  isx60             numeric,
  isx15             numeric,
  total_volume      numeric,
  total_value       numeric,
  total_trades      numeric,
  traded_companies  int,
  listed_companies  int
);

create table if not exists sector_monthly (
  year              int  not null,
  month             int  not null check (month between 1 and 12),
  sector            text not null,
  volume            numeric,
  value             numeric,
  trades            numeric,
  traded_companies  int,
  listed_companies  int,
  market_cap        numeric,
  primary key (year, month, sector)
);

create index if not exists monthly_prices_ym on monthly_prices (year, month);
create index if not exists sector_monthly_ym on sector_monthly (year, month);

-- The pipeline writes with the service-role key (bypasses RLS). Enable RLS so
-- the anon key can only read.
alter table companies       enable row level security;
alter table monthly_prices  enable row level security;
alter table daily_index     enable row level security;
alter table sector_monthly  enable row level security;

drop policy if exists "public read companies"      on companies;
drop policy if exists "public read monthly_prices" on monthly_prices;
drop policy if exists "public read daily_index"    on daily_index;
drop policy if exists "public read sector_monthly" on sector_monthly;

create policy "public read companies"      on companies      for select using (true);
create policy "public read monthly_prices" on monthly_prices for select using (true);
create policy "public read daily_index"    on daily_index    for select using (true);
create policy "public read sector_monthly" on sector_monthly for select using (true);
