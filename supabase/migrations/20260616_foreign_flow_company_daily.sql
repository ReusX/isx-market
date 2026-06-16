-- Daily per-company foreign trading flow, parsed from the "اجانب" sheet of the
-- ISX daily report workbook. One row per (date, ticker, side): the foreign
-- BUY side (المشتراة / أوامر الشراء = inflow) and SELL side (المباعة /
-- أوامر البيع = outflow) are stored separately; values are summed across
-- markets (نظامي / ثاني / غير مفصحة). Net inflow for a company on a day is
-- (buy value) - (sell value), computed at read time.
--
-- Powers the live "أعلى تدفق أجنبي اليوم" section on /statistics. Updated daily
-- by the /api/cron/daily-prices Vercel cron (same workbook it already fetches),
-- and backfilled in bulk by scripts/backfill_foreign_company.py.

create table if not exists foreign_flow_company_daily (
    date    date    not null,
    ticker  text    not null,
    side    text    not null check (side in ('buy', 'sell')),
    trades  integer,
    volume  numeric,
    value   numeric,
    created_at timestamptz default now(),
    primary key (date, ticker, side)
);

create index if not exists ffcd_date_idx   on foreign_flow_company_daily (date);
create index if not exists ffcd_ticker_idx on foreign_flow_company_daily (ticker);

-- Public read-only (anon) access, consistent with the other statistics tables.
alter table foreign_flow_company_daily enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'foreign_flow_company_daily' and policyname = 'public read ffcd'
  ) then
    create policy "public read ffcd" on foreign_flow_company_daily
      for select using (true);
  end if;
end $$;
