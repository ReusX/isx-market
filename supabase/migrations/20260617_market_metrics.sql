-- ============================================================================
-- Market breadth + per-company metrics  (Tier-1 investor features)
--
-- Fully ADDITIVE: two materialized views + one refresh function + read grants.
-- Touches no existing table. To fully undo:
--   drop function if exists refresh_isx_metrics();
--   drop materialized view if exists company_metrics;
--   drop materialized view if exists breadth_daily;
-- ============================================================================

-- ── 1. Daily market breadth ────────────────────────────────────────────────
-- One row per trading date: advancers / decliners / unchanged vs each stock's
-- previous *traded* close, up/down volume split, and new 52-week highs/lows.
drop materialized view if exists breadth_daily cascade;
create materialized view breadth_daily as
with px as (
  select
    ticker, date, close, volume,
    lag(close)  over w                                   as prev_close,
    row_number() over w                                  as rn,
    max(close)  over (partition by ticker order by date
                      rows between 251 preceding and current row) as hi252,
    min(close)  over (partition by ticker order by date
                      rows between 251 preceding and current row) as lo252
  from daily_prices
  where close is not null and close > 0
  window w as (partition by ticker order by date)
)
select
  date,
  count(*) filter (where prev_close is not null and close > prev_close)            as advancers,
  count(*) filter (where prev_close is not null and close < prev_close)            as decliners,
  count(*) filter (where prev_close is not null and close = prev_close)            as unchanged,
  coalesce(sum(volume) filter (where prev_close is not null and close > prev_close), 0) as up_volume,
  coalesce(sum(volume) filter (where prev_close is not null and close < prev_close), 0) as down_volume,
  count(*) filter (where rn >= 60 and close >= hi252)                              as new_highs,
  count(*) filter (where rn >= 60 and close <= lo252)                              as new_lows,
  count(*)                                                                          as traded
from px
group by date;

create unique index breadth_daily_date_uidx on breadth_daily (date);

-- ── 2. Per-company current metrics (screener + company-page source) ─────────
-- One row per ticker: latest close, % change across windows, 52w range,
-- liquidity (avg traded value, days since last trade), and 30d foreign flow.
drop materialized view if exists company_metrics cascade;
create materialized view company_metrics as
with last_px as (
  select distinct on (ticker)
    ticker, date as last_date, close as last_close
  from daily_prices
  where close is not null and close > 0
  order by ticker, date desc
),
mkt as ( select max(date) as session_date from daily_prices )
select
  lp.ticker,
  co.name_en, co.name_ar,
  -- normalized sector (raw column has Banks/Banking, Service/Services, etc.)
  case
    when co.sector in ('Banks','Banking')              then 'Banks'
    when co.sector in ('Service','Services')           then 'Services'
    when co.sector in ('Agriculture','Agricultur')     then 'Agriculture'
    when co.sector in ('Investment','Financial services') then 'Investment'
    when co.sector = 'Telecommunication'               then 'Telecom'
    when co.sector = 'Tourism&Hotels'                  then 'Tourism'
    else coalesce(co.sector, 'Other')
  end                                                                              as sector,
  lp.last_date,
  lp.last_close,
  (select close from daily_prices d where d.ticker=lp.ticker and d.date < lp.last_date and d.close>0 order by d.date desc limit 1) as prev_close,
  -- as-of closes for each lookback window
  (select close from daily_prices d where d.ticker=lp.ticker and d.date <= lp.last_date - interval '7 day'   and d.close>0 order by d.date desc limit 1) as close_1w,
  (select close from daily_prices d where d.ticker=lp.ticker and d.date <= lp.last_date - interval '30 day'  and d.close>0 order by d.date desc limit 1) as close_1m,
  (select close from daily_prices d where d.ticker=lp.ticker and d.date <= lp.last_date - interval '90 day'  and d.close>0 order by d.date desc limit 1) as close_3m,
  (select close from daily_prices d where d.ticker=lp.ticker and d.date <  date_trunc('year', lp.last_date)  and d.close>0 order by d.date desc limit 1) as close_yend,
  (select close from daily_prices d where d.ticker=lp.ticker and d.date <= lp.last_date - interval '365 day' and d.close>0 order by d.date desc limit 1) as close_52w,
  -- 52-week range
  (select max(close) from daily_prices d where d.ticker=lp.ticker and d.date >= lp.last_date - interval '365 day' and d.close>0) as high_52w,
  (select min(close) from daily_prices d where d.ticker=lp.ticker and d.date >= lp.last_date - interval '365 day' and d.close>0) as low_52w,
  -- liquidity
  (select avg(value) from (select value from daily_prices d where d.ticker=lp.ticker and d.value is not null order by d.date desc limit 20) z) as avg_value_20d,
  (select avg(value) from (select value from daily_prices d where d.ticker=lp.ticker and d.value is not null order by d.date desc limit 90) z) as avg_value_90d,
  (select count(*) from daily_prices d where d.ticker=lp.ticker and d.date >= lp.last_date - interval '30 day' and d.volume>0) as trading_days_30,
  (m.session_date - lp.last_date)                                                  as days_since_trade,
  -- net foreign flow over last 30 days (buy value − sell value)
  (select coalesce(sum(case when side='buy' then value else -value end),0)
     from foreign_flow_company_daily f
    where f.ticker=lp.ticker and f.date >= lp.last_date - interval '30 day')       as ff_net_30d
from last_px lp
cross join mkt m
left join companies co on co.ticker = lp.ticker;

create unique index company_metrics_ticker_uidx on company_metrics (ticker);

-- ── 3. Refresh function (called by the daily cron after daily_prices lands) ──
create or replace function refresh_isx_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- plain (non-concurrent) refresh: CONCURRENTLY is disallowed inside a function
  -- body / transaction. These views are small and rebuild in ~seconds, so the
  -- brief refresh-time lock once per day is acceptable.
  refresh materialized view breadth_daily;
  refresh materialized view company_metrics;
end;
$$;

-- ── 4. Read access (anon + authenticated read the views; only service_role
--      may run the refresh) ────────────────────────────────────────────────
grant select on breadth_daily   to anon, authenticated;
grant select on company_metrics to anon, authenticated;
revoke all on function refresh_isx_metrics() from public;
grant execute on function refresh_isx_metrics() to service_role;
