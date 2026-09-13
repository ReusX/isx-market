/**
 * What the publishable key can actually do.
 *
 *   node scripts/db-permissions.mjs
 *
 * The Supabase advisor reads the catalog and tells you what a grant SAYS.
 * This asks the API what a stranger can DO, with nothing but the key that
 * ships in the browser. The two disagreed: a migration from June revoked
 * EXECUTE on refresh_isx_metrics() from public, the advisor flagged it anyway,
 * and the key ran it.
 *
 * ⚠ The RPC probe is a real call. While the grant is still there it triggers
 * one non-concurrent refresh of two materialized views — the same work the
 * daily cron does. Once 20260913_advisor_fixes.sql is applied it is refused
 * and nothing runs.
 */
const U = process.env.NEXT_PUBLIC_SUPABASE_URL
const A = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!U || !A) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY not set'); process.exit(1) }
const H = { apikey: A, Authorization: `Bearer ${A}`, 'Content-Type': 'application/json' }

let failed = 0
const ok = (name, pass, detail = '') => {
  if (!pass) failed++
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const WRITE_TABLES = [
  'banks', 'bank_products', 'product_facts', 'product_conditions', 'bank_services',
  'daily_prices', 'financial_facts', 'fx_observations', 'data_sources', 'fact_policy',
  'major_shareholders', 'rates_cache', 'company_analysis', 'chat_messages', 'profiles',
]
/* Tables holding somebody's personal data. Anon reading zero rows here is the
   RLS policy working, not the table being empty — scripts/../banking gates
   cover emptiness; this covers reachability. */
const PRIVATE_TABLES = [
  'profiles', 'holdings', 'transactions', 'wallet_requests',
  'quest_completions', 'snake_scores', 'penalty_shots', 'referrals',
]

console.log('database permissions · what the publishable key can do')

for (const t of WRITE_TABLES) {
  const r = await fetch(`${U}/rest/v1/${t}`, { method: 'POST', headers: H, body: '{}', cache: 'no-store' })
  ok(`anon cannot write to ${t}`, !r.ok, `HTTP ${r.status}`)
}

for (const t of PRIVATE_TABLES) {
  const r = await fetch(`${U}/rest/v1/${t}?select=*&limit=1`, { headers: H, cache: 'no-store' })
  const rows = r.ok ? await r.json().catch(() => []) : []
  ok(`anon reads no rows from ${t}`, !r.ok || rows.length === 0,
    r.ok ? `${rows.length} row(s) readable` : `HTTP ${r.status}`)
}

/* SECURITY DEFINER functions the key must not be able to start. */
const r = await fetch(`${U}/rest/v1/rpc/refresh_isx_metrics`, {
  method: 'POST', headers: H, body: '{}', cache: 'no-store',
})
ok('anon cannot run refresh_isx_metrics()', !r.ok,
  r.ok ? `HTTP ${r.status} — THE REFRESH RAN; apply 20260913_advisor_fixes.sql` : `HTTP ${r.status}`)

if (failed) { console.error(`✗ ${failed} permission check(s) failed`); process.exit(1) }
console.log('✓ the publishable key can only read public data')
