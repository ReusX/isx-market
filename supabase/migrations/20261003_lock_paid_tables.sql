-- «IQWealth برو» · the paid data is no longer readable with the public key.
--
-- The financial filings (facts, ratios, reports and their *_public views)
-- and the per-company foreign flow were readable by anyone holding the anon
-- key, which ships in every page — so the paywall could be read around. The
-- site now reads them only on the server, with the service key, through the
-- published views (lib/marketServer paid(), lib/banks, lib/resultsServer,
-- lib/wrapServer, /api/flow/market). Applied after that code went live.

drop policy if exists "public reads published facts" on public.financial_facts;
drop policy if exists "public reads published ratios" on public.financial_ratios;
drop policy if exists "public reads published reports" on public.financial_reports;
drop policy if exists "public read ffcd" on public.foreign_flow_company_daily;

revoke select on public.financial_facts, public.financial_ratios, public.financial_reports,
  public.financial_facts_public, public.financial_ratios_public, public.financial_reports_public,
  public.foreign_flow_company_daily
  from anon, authenticated;

-- Hygiene: TRUNCATE ignores row-level security. PostgREST never issues it,
-- but no client role has any business holding it.
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('revoke truncate on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;
