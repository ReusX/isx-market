-- ============================================================================
-- Fundamental data / financial statements  (new product surface)
--
-- Turns the inconsistent scanned-PDF financial reports published per company
-- on the ISC site into clean, normalized, comparable numbers.
--
-- Design:
--   • financial_reports  — the report INDEX (one row per published PDF), plus
--     extraction status + the accounting-identity check results.
--   • financial_facts    — extracted line items in LONG/EAV form so the SAME
--     table holds both the bank template and the industrial template (they
--     share no line set). Every fact keeps its provenance: the original Arabic
--     label, page number, confidence, and the unit AS REPORTED.
--   • financial_ratios   — computed ratios, also long, so each template can
--     emit its own ratio set (banks: capital adequacy / NPL; industrials: P/E
--     / margins) without schema churn.
--
-- Trust model: nothing is shown publicly until a human flips status to
-- 'published'. The public read views below are gated on that. Base tables are
-- service-role only.
--
-- Fully ADDITIVE. To fully undo:
--   drop view if exists financial_facts_public, financial_ratios_public,
--        financial_reports_public cascade;
--   drop table if exists financial_ratios, financial_facts, financial_reports cascade;
-- ============================================================================

-- ── 1. Report index ─────────────────────────────────────────────────────────
-- One row per PDF the ISC publishes for a company. id == the ISC report id so
-- re-ingesting is an idempotent upsert. We store the stable ISC pdf_url and
-- extract from it on demand — we do NOT bulk-archive the PDFs (≈20GB, blows the
-- free storage tier). pdf_path is reserved for optionally archiving MVP names.
create table if not exists financial_reports (
  id                bigint primary key,            -- ISC source report id
  company_id        integer not null,              -- ISC company id
  ticker            text    not null,
  fiscal_year       integer not null,
  period            text    not null,              -- 'Q1'|'Q2'|'Q3'|'Q4'|'ANNUAL'
  template          text,                          -- 'bank'|'insurance'|'industrial' (set at extraction)
  pdf_url           text    not null,              -- stable ISC url
  pdf_path          text,                          -- optional archived storage path
  source_added_date timestamptz,                   -- when ISC uploaded it
  status            text    not null default 'pending',
                    -- pending | extracted | reviewed | published | failed | skipped
  checks            jsonb,                         -- accounting-identity check results
  unit_reported     text,                          -- 'IQD_THOUSANDS' | 'IQD_MILLIONS' | 'IQD'
  notes             text,
  extracted_at      timestamptz,
  published_at      timestamptz,
  updated_at        timestamptz not null default now()
);
create index if not exists financial_reports_ticker_idx  on financial_reports (ticker, fiscal_year, period);
create index if not exists financial_reports_status_idx  on financial_reports (status);

-- ── 2. Extracted facts (normalized line items) ──────────────────────────────
-- LONG form. `value_iqd` is normalized to absolute Iraqi dinars so every
-- company is comparable regardless of whether the PDF reported thousands or
-- millions. `value_reported` + `unit_reported` keep the raw number for audit.
create table if not exists financial_facts (
  report_id        bigint not null references financial_reports(id) on delete cascade,
  ticker           text    not null,
  fiscal_year      integer not null,
  period           text    not null,
  statement        text    not null,   -- 'income' | 'balance' | 'cashflow' | 'metrics'
  line_key         text    not null,   -- canonical key, e.g. 'revenue','net_income','total_assets'
  value_iqd        numeric,            -- normalized to absolute IQD
  value_reported   numeric,            -- as printed in the PDF
  unit_reported    text,               -- 'IQD_THOUSANDS' | 'IQD_MILLIONS' | 'IQD'
  source_label_ar  text,               -- the exact Arabic label it was mapped from
  page             integer,            -- PDF page the number came from
  confidence       numeric,            -- 0..1 from the extractor
  primary key (report_id, statement, line_key)
);
create index if not exists financial_facts_lookup_idx on financial_facts (ticker, fiscal_year, period);

-- ── 3. Computed ratios ──────────────────────────────────────────────────────
create table if not exists financial_ratios (
  ticker       text    not null,
  fiscal_year  integer not null,
  period       text    not null,
  ratio_key    text    not null,   -- 'eps','pe','pb','roe','roa','net_margin','car','npl_ratio',...
  value        numeric,
  inputs       jsonb,              -- {numerator, denominator, price_used, asof} for transparency
  computed_at  timestamptz not null default now(),
  primary key (ticker, fiscal_year, period, ratio_key)
);
create index if not exists financial_ratios_lookup_idx on financial_ratios (ticker, fiscal_year, period);

-- ── 4. Public read views (gated on published) ───────────────────────────────
-- The site reads ONLY these. Unpublished extractions never leak.
create or replace view financial_reports_public as
  select id, company_id, ticker, fiscal_year, period, template, pdf_url,
         source_added_date, unit_reported, published_at
  from financial_reports
  where status = 'published';

create or replace view financial_facts_public as
  select f.ticker, f.fiscal_year, f.period, f.statement, f.line_key,
         f.value_iqd, f.unit_reported, f.source_label_ar
  from financial_facts f
  join financial_reports r on r.id = f.report_id
  where r.status = 'published';

create or replace view financial_ratios_public as
  select x.ticker, x.fiscal_year, x.period, x.ratio_key, x.value
  from financial_ratios x
  where exists (
    select 1 from financial_reports r
    where r.ticker = x.ticker and r.fiscal_year = x.fiscal_year
      and r.period = x.period and r.status = 'published'
  );

-- ── 5. Grants ────────────────────────────────────────────────────────────────
-- Base tables: service_role only (the pipeline writes them). anon/auth read
-- through the published views.
grant select on financial_reports_public, financial_facts_public, financial_ratios_public
  to anon, authenticated;
