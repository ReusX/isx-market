-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: financial_reports / financial_facts / financial_ratios were created
-- WITHOUT row-level security, so the public anon key could read (and, via
-- Supabase's default public grants, insert/update/DELETE) every row — including
-- unpublished drafts and internal extraction metadata.
--
-- This migration:
--   1. Enables RLS on the three base tables (closes write/delete + unpublished leak).
--   2. Revokes the broad default grants from anon / authenticated.
--   3. Re-grants SELECT only on the *columns the public views expose* (so even a
--      direct base-table read can't see internal columns like notes/checks/
--      confidence/inputs/pdf_path).
--   4. Adds SELECT-only RLS policies limited to PUBLISHED rows.
--   5. Switches the *_public views to security_invoker so they respect the
--      caller's RLS (clears the "Security Definer View" advisor too).
--
-- service_role bypasses RLS, so the extraction/ingest pipeline is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS ----------------------------------------------------------------
alter table financial_reports enable row level security;
alter table financial_facts   enable row level security;
alter table financial_ratios  enable row level security;

-- 2. Drop the broad default grants ---------------------------------------------
revoke all on financial_reports from anon, authenticated;
revoke all on financial_facts   from anon, authenticated;
revoke all on financial_ratios  from anon, authenticated;

-- 3. Column-scoped SELECT grants (only what the views need / expose) -----------
--    Includes join/filter columns (report_id, id, status) used by the views.
grant select (id, company_id, ticker, fiscal_year, period, template, pdf_url,
              source_added_date, unit_reported, published_at, status)
  on financial_reports to anon, authenticated;

grant select (report_id, ticker, fiscal_year, period, statement, line_key,
              value_iqd, unit_reported, source_label_ar)
  on financial_facts to anon, authenticated;

grant select (ticker, fiscal_year, period, ratio_key, value)
  on financial_ratios to anon, authenticated;

-- 4. Read-only RLS policies: published rows only -------------------------------
drop policy if exists "public reads published reports" on financial_reports;
create policy "public reads published reports" on financial_reports
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "public reads published facts" on financial_facts;
create policy "public reads published facts" on financial_facts
  for select to anon, authenticated
  using (exists (
    select 1 from financial_reports r
    where r.id = financial_facts.report_id and r.status = 'published'
  ));

drop policy if exists "public reads published ratios" on financial_ratios;
create policy "public reads published ratios" on financial_ratios
  for select to anon, authenticated
  using (exists (
    select 1 from financial_reports r
    where r.ticker = financial_ratios.ticker
      and r.fiscal_year = financial_ratios.fiscal_year
      and r.period = financial_ratios.period
      and r.status = 'published'
  ));

-- 5. Make the public views respect the caller's RLS (PG15+) --------------------
alter view financial_reports_public set (security_invoker = on);
alter view financial_facts_public  set (security_invoker = on);
alter view financial_ratios_public set (security_invoker = on);
