-- ═══════════════════════════════════════════════════════════════════════════
-- FX observation spine
--
-- Until now every dollar rate this site displayed was written into a single
-- row of `rates_cache` and destroyed by the next fetch. Hundreds of
-- observations, none kept. The visible symptom: the cached record carries
-- "change": null, because the page has no yesterday to compare against.
--
-- The official CBI rate is backfillable from the bank's own workbooks. The
-- parallel-market rate is not — no archive we control, none we trust. Parallel
-- history therefore begins with the first row this table receives, which is
-- why this migration comes before any bank or loan work.
--
-- `rates_cache` is deliberately NOT touched. It keeps its exact shape and its
-- one job: the last-known-good value `readFxCache()` serves when the source is
-- unreachable. This table is the historical record; that one is resilience.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Sources ────────────────────────────────────────────────────────────────
-- Shared by FX now and by bank/loan products later, so "where did this come
-- from" resolves the same way across the whole product.

create table if not exists public.data_sources (
  id          bigint generated always as identity primary key,
  key         text not null unique,          -- 'alsumaria' | 'cbi-web' | 'cbi-xlsx'
  name_ar     text not null,
  name_en     text not null,
  url         text,
  kind        text not null,                 -- 'news' | 'official' | 'dataset'
  reliability text not null default 'medium' -- 'high' | 'medium' | 'low'
    check (reliability in ('high','medium','low')),
  notes       text,
  created_at  timestamptz not null default now()
);

comment on table public.data_sources is
  'Registry of every external source a published figure can be traced to.';

insert into public.data_sources (key, name_ar, name_en, url, kind, reliability, notes) values
  ('alsumaria', 'قناة السومرية', 'Alsumaria TV', 'https://www.alsumaria.tv', 'news', 'medium',
   'Daily closing-price article for the parallel market. Newsroom prose: the wording drifts and has broken the parser three times, so scripts/fx-parser-test.ts pins real published sentences as fixtures.'),
  ('cbi-web', 'البنك المركزي العراقي — الموقع', 'Central Bank of Iraq — website', 'https://cbi.iq', 'official', 'high',
   'The rate table on the CBI homepage, served as static HTML. This is the rate the issuer publishes.'),
  ('cbi-xlsx', 'البنك المركزي العراقي — الجداول', 'Central Bank of Iraq — workbooks', 'https://cbi.iq/page/144', 'dataset', 'high',
   'Downloadable daily/monthly workbooks, official rates from 2003. File URLs carry opaque ids that change on re-upload, so the listing page must be re-scraped for the current link rather than the URL hardcoded.'),
  ('iraq-budget', 'الموازنة الاتحادية', 'Federal budget', null, 'official', 'high',
   'The statutory rate set in the federal budget law. A policy figure, changed by legislation, not observed from a market.')
on conflict (key) do nothing;

-- ── Observations ───────────────────────────────────────────────────────────
-- Append-only. Nothing in the application may UPDATE or DELETE a row here.

create table if not exists public.fx_observations (
  id           bigint generated always as identity primary key,

  /* WHICH QUANTITY. Iraq has no single "official rate": the budget sets one
     figure, the CBI publishes another, and a person at a bank counter pays a
     third. Collapsing them loses the distinction that makes the spread mean
     anything, so each is its own series. */
  series       text not null check (series in (
                 'parallel',            -- market quote between dealers, buy/sell
                 'official_cbi',        -- what the CBI publishes
                 'official_statutory',  -- budget / legislated reference
                 'effective_bank'       -- end-user rate after bank costs
               )),
  location     text not null default 'baghdad',

  buy          numeric(12,3),
  sell         numeric(12,3),
  /* A one-sided quote still has a usable level, so `mid` falls back to
     whichever side exists rather than going null and dropping out of charts. */
  mid          numeric(12,3) generated always as (
                 case
                   when buy is not null and sell is not null then (buy + sell) / 2
                   else coalesce(buy, sell)
                 end
               ) stored,

  /* WHEN IT WAS TRUE, to the second — not the day. Recording three times
     through the Iraqi trading session must keep three rows, otherwise open,
     close, intraday high/low and volatility are all unrecoverable. */
  observed_at   timestamptz not null,
  /* Baghdad calendar date, supplied by the writer. `at time zone` is only
     STABLE, so this cannot be a generated column; the writer derives it once
     and the importer sets historical dates directly. */
  observed_date date not null,

  /* WHEN WE SAW IT — distinct from when it was true, and from when the source
     published it. All three are different questions. */
  retrieved_at timestamptz not null default now(),
  source_ts    timestamptz,

  /* HOW IT GOT HERE. `imported` is history loaded from a published dataset;
     `recorded` is an observation this system made itself. The chart must not
     imply we were watching the market in 2009. */
  origin       text not null default 'recorded' check (origin in ('recorded','imported')),

  source_id    bigint not null references public.data_sources(id),
  source_url   text,

  /* THE SOURCE EVENT — the published thing this observation came from.
     Alsumaria is event-shaped, so this is the article id ('alsumaria:574430')
     and several may land in one day. The CBI homepage is a standing table with
     no event, so its key is day-scoped ('cbi-web:2026-08-31'): repeated fetches
     collapse, while a mid-day change still records. One column, two source
     shapes, one dedupe rule. */
  source_event text not null,

  /* EVIDENCE. A URL is not durable — a page can be edited under the same
     address. The excerpt is the sentence actually parsed, and the hash
     fingerprints it, so a later disagreement can be settled by asking whether
     the source changed or the parser misread. */
  raw_excerpt  text,
  content_hash text,

  /* DEDUPE. Identity above answers "when was this true"; this answers "is this
     a new quote, or the same one fetched again". Values are part of the key on
     purpose: re-fetching an unchanged article inserts nothing, while an article
     silently corrected to a different rate inserts a second row and both remain
     visible. A cron every few hours therefore cannot manufacture activity. */
  dedupe_key   text generated always as (
                 source_id::text || '|' || source_event || '|' || series || '|' || location
                 || '|' || coalesce(buy::text, '~') || '|' || coalesce(sell::text, '~')
               ) stored,

  created_at   timestamptz not null default now(),

  constraint fx_observations_dedupe_key_uniq unique (dedupe_key),
  /* A row with neither side is not an observation of anything. */
  constraint fx_observations_has_a_value check (buy is not null or sell is not null),
  /* Currency dealers do not sell below what they buy at. A violation means the
     parser swapped the sides — which it has done before. */
  constraint fx_observations_spread_sane check (buy is null or sell is null or sell >= buy)
);

comment on table public.fx_observations is
  'Append-only record of every USD/IQD observation. Never UPDATE or DELETE.';

create index if not exists fx_obs_series_date
  on public.fx_observations (series, location, observed_date desc);
create index if not exists fx_obs_series_at
  on public.fx_observations (series, location, observed_at desc);
create index if not exists fx_obs_origin
  on public.fx_observations (origin, series, observed_date desc);

-- ── Daily rollup ───────────────────────────────────────────────────────────
-- Charts and change-over-period read this rather than pivoting raw rows.
-- Intraday detail stays in the table underneath and is never discarded.

create or replace view public.fx_daily as
select
  series,
  location,
  observed_date,
  min(origin)                                            as origin,
  count(*)                                               as observations,
  (array_agg(mid  order by observed_at asc ))[1]         as open,
  (array_agg(mid  order by observed_at desc))[1]         as close,
  max(mid)                                               as high,
  min(mid)                                               as low,
  (array_agg(buy  order by observed_at desc))[1]         as buy_close,
  (array_agg(sell order by observed_at desc))[1]         as sell_close,
  max(observed_at)                                       as last_observed_at
from public.fx_observations
group by series, location, observed_date;

comment on view public.fx_daily is
  'One row per series/location/day. `observations` says how many readings it rests on — a day built from one reading is not the same evidence as a day built from four, and the UI should be able to say so.';

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Public market data, so it reads publicly. No write policy exists, which
-- leaves writes to the service role alone (it bypasses RLS). This follows the
-- June hardening rule: no table ships with RLS off.

alter table public.data_sources    enable row level security;
alter table public.fx_observations enable row level security;

drop policy if exists data_sources_read    on public.data_sources;
drop policy if exists fx_observations_read on public.fx_observations;

create policy data_sources_read    on public.data_sources    for select using (true);
create policy fx_observations_read on public.fx_observations for select using (true);

grant select on public.data_sources, public.fx_observations, public.fx_daily to anon, authenticated;
