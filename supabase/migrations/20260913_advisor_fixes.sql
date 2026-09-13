/*
 * Supabase advisor findings, 13 September 2026.
 *
 * Two real problems and one that only looks like one.
 *
 * 1. refresh_isx_metrics() was executable by anon. CONFIRMED by calling it
 *    with the publishable key: HTTP 204, the refresh ran. The function is
 *    SECURITY DEFINER and does a NON-CONCURRENT `refresh materialized view`
 *    on breadth_daily and company_metrics — which takes an ACCESS EXCLUSIVE
 *    lock on the two views the screener, the market page and the portfolio
 *    read. Anyone could have held the site's own data hostage in a loop, for
 *    the price of an HTTP request.
 *
 *    20260617_market_metrics.sql already revoked it. The grant came back,
 *    which is what happens when a function is dropped and recreated: a NEW
 *    function grants EXECUTE to PUBLIC by default, and only `create or
 *    replace` over an existing one preserves privileges. So the revoke is
 *    restated here and the gate below it is what keeps it honest.
 *
 * 2. handle_new_user() is SECURITY DEFINER and inserts into profiles. It is a
 *    trigger function, so PostgREST does not expose it and it is not callable
 *    over the API today — but it is granted to PUBLIC, and that is one
 *    refactor away from mattering.
 *
 * 3. The six views flagged CRITICAL run with their owner's rights, so they do
 *    not apply the RLS of the tables under them. Every one of those tables is
 *    public-read by policy — this is reference and market data, and the
 *    publishable key reads it directly — so nothing was exposed that was not
 *    already public. Setting security_invoker anyway: the view should not be
 *    the reason something is readable.
 *
 *    NOT included: financial_facts_public, financial_ratios_public and
 *    financial_reports_public. Those exist precisely to expose a filtered
 *    slice of tables anon cannot read, so definer semantics is what makes
 *    them work. Flipping those would empty them.
 */

-- ── 1 · the confirmed one ───────────────────────────────────────────────────
revoke all on function public.refresh_isx_metrics() from public;
revoke all on function public.refresh_isx_metrics() from anon, authenticated;
grant execute on function public.refresh_isx_metrics() to service_role;

-- ── 2 · reachable only through the signup trigger, which runs as its owner ──
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- ── 3 · views stop being a way around RLS ───────────────────────────────────
alter view public.product_facts_current   set (security_invoker = on);
alter view public.bank_products_current   set (security_invoker = on);
alter view public.bank_services_current   set (security_invoker = on);
alter view public.bank_facts_stale        set (security_invoker = on);
alter view public.fx_daily                set (security_invoker = on);
alter view public.latest_trade            set (security_invoker = on);

/*
 * Deliberately NOT changed
 * ────────────────────────
 * breadth_daily and company_metrics are materialized views, and a
 * materialized view cannot enforce RLS at all — which is what the advisor's
 * "Materialized View in API" means. They hold closing prices, volumes and
 * ratios for listed companies: public by nature, published by the exchange,
 * and read straight from the browser by the screener and the portfolio. The
 * grant is intentional. Revoking it would break those pages and protect
 * nothing.
 */

/* ── Performance, not security ──────────────────────────────────────────────
 *
 * The advisor's "unindexed foreign keys" on our own tables. A foreign key
 * with no index makes the referenced row's delete scan the child table, and
 * makes joins in that direction sequential. All three point at data_sources —
 * the provenance join every bank fact and every FX observation goes through.
 *
 * Only OUR tables are touched here. chat_messages and penalty_shots carry the
 * same warning and belong to the other application in this project; its
 * indexes are its own call.
 */
create index if not exists banks_licence_source
  on public.banks (licence_source_id);
create index if not exists product_facts_source
  on public.product_facts (source_id);
create index if not exists bank_services_source
  on public.bank_services (source_id);
create index if not exists fx_observations_source
  on public.fx_observations (source_id);
