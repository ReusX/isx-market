/**
 * The price chart must never be older than the database.
 *
 *   node scripts/chart-freshness.mjs              static rules + live check
 *   node scripts/chart-freshness.mjs --static-only  no network
 *   node scripts/chart-freshness.mjs --self-test    check the analyser itself
 *
 * Written after every chart on the site sat frozen on 1 September while the
 * page header, reading the same table from the browser, showed 8 September.
 * Nothing was broken in the ingest and nothing was broken in the query: the
 * route handler behind /api/chart/[sym] built a supabase-js client, supabase-js
 * issues its reads through the global `fetch`, and an unqualified `fetch`
 * inside a route handler is stored in Next's Data Cache indefinitely. The
 * route answered its first request honestly and then answered every request
 * after it from that snapshot, for a week, with a `MISS` on the CDN cache
 * because the CDN was not the layer holding the copy.
 *
 * That failure is invisible: no error, no warning, no build output, a 200 with
 * a plausible-looking series. So this gate looks at it from both ends.
 *
 *   STATIC   Every route handler that reads our data must state a caching
 *            intent. supabase-js hides its fetch, so a route using it must
 *            also hand it a fetch that says what to do.
 *   LIVE     The deployed endpoint is compared against the table it claims to
 *            read: same last session, same close, same number of rows. This is
 *            the check that would have caught the bug, because it asks the
 *            question a reader asks — is the last candle today's?
 */
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const STATIC_ONLY = argv.includes('--static-only')
const BASE = process.env.CHART_BASE || 'https://iraqsm.com'

let failed = 0
const ok = (name, pass, detail = '') => {
  if (!pass) failed++
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/* ── the analyser ───────────────────────────────────────────────────────────
   Deliberately textual. The rule is about what the file DECLARES, and a
   declaration is a literal — `export const dynamic = 'force-dynamic'` either
   is in the file or is not. */
export function analyse(src) {
  const problems = []
  const readsOurData =
    /from\s+['"]@supabase\/supabase-js['"]/.test(src) ||
    /\/rest\/v1\//.test(src)
  if (!readsOurData) return problems

  const declaresMode =
    /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(src) ||
    /export\s+const\s+revalidate\s*=\s*\d+/.test(src)
  if (!declaresMode) {
    problems.push('reads our data but declares no rendering mode ' +
      "(export const dynamic = 'force-dynamic', or export const revalidate = <seconds>)")
  }

  /* supabase-js does not take a caching option. The only place to say
     anything is the fetch it is given, so a route that builds a client and
     never overrides `fetch` has silently accepted the default: cache forever. */
  const buildsSupabaseClient = /createClient\s*\(\s*\n?\s*process\.env/.test(src) ||
    /from\s+['"]@supabase\/supabase-js['"]/.test(src)
  const overridesFetch = /global\s*:\s*\{[^}]*fetch\s*:/.test(src)
  const overrideSaysWhat = /cache:\s*['"]no-store['"]|next:\s*\{\s*revalidate/.test(src)
  if (buildsSupabaseClient && !(overridesFetch && overrideSaysWhat)) {
    problems.push('builds a supabase-js client without giving it a fetch that ' +
      "states a caching intent ({ global: { fetch: (u, i) => fetch(u, { ...i, cache: 'no-store' }) } })")
  }

  /* A bare fetch of PostgREST has the same default and the same silence. */
  for (const m of src.matchAll(/await fetch\(([\s\S]{0,400}?)\n\s*\)/g)) {
    const call = m[1]
    if (!/\/rest\/v1\//.test(call)) continue
    if (!/next:\s*\{|cache:\s*['"]/.test(call)) {
      problems.push('fetches PostgREST without `next: { revalidate }` or `cache:`')
    }
  }
  return problems
}

if (argv.includes('--self-test')) {
  console.log('chart freshness · analyser self-test')
  const client = "import { createClient } from '@supabase/supabase-js'\n"
  const cases = [
    [client + 'const sb = createClient(process.env.A, process.env.B)\n', true,
      'the shape the bug shipped in: a client, no mode, no fetch'],
    [client + "export const dynamic = 'force-dynamic'\nconst sb = createClient(process.env.A, process.env.B)\n", true,
      'declares the mode but still lets supabase-js cache forever'],
    [client + 'const sb = createClient(process.env.A, process.env.B, ' +
      "{ global: { fetch: (u, i) => fetch(u, { ...i, cache: 'no-store' }) } })\n", true,
      'no-store fetch but no rendering mode'],
    [client + "export const dynamic = 'force-dynamic'\nconst sb = createClient(process.env.A, process.env.B, " +
      "{ global: { fetch: (u, i) => fetch(u, { ...i, cache: 'no-store' }) } })\n", false,
      'the fix'],
    ["export const revalidate = 300\nconst r = await fetch(`${U}/rest/v1/daily_prices?select=date`, {\n  headers: H,\n  next: { revalidate: 300 },\n)\n", false,
      'a bare PostgREST read that states its revalidate'],
    ["export const dynamic = 'force-dynamic'\nconst r = await fetch(`${U}/rest/v1/daily_prices?select=date`, {\n  headers: H,\n)\n", true,
      'a bare PostgREST read that states nothing'],
    ["export default function Page() { return null }\n", false, 'a file that reads nothing'],
  ]
  let bad = 0
  for (const [src, shouldFlag, label] of cases) {
    const got = analyse(src).length > 0
    if (got !== shouldFlag) {
      console.error(`  ✗ ${label}: expected ${shouldFlag ? 'FLAG' : 'clean'}, got ${got ? 'FLAG' : 'clean'}`)
      bad++
    } else {
      console.log(`  ✓ ${label} → ${got ? 'flagged' : 'clean'}`)
    }
  }
  if (bad) { console.error(`✗ analyser self-test failed (${bad})`); process.exit(1) }
  console.log('✓ analyser self-test passes')
  process.exit(0)
}

/* ── static ─────────────────────────────────────────────────────────────── */
function routeFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) routeFiles(p, out)
    else if (e.name === 'route.ts' || e.name === 'route.tsx') out.push(p)
  }
  return out
}

console.log('chart freshness')
for (const f of routeFiles('app/api')) {
  const problems = analyse(fs.readFileSync(f, 'utf8'))
  ok(f, problems.length === 0, problems.join(' · '))
}

/* ── live ───────────────────────────────────────────────────────────────── */
if (STATIC_ONLY) {
  console.log('  · live check skipped (--static-only)')
} else {
  const U = process.env.NEXT_PUBLIC_SUPABASE_URL
  const K = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!U || !K) {
    console.error('✗ NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY not set — cannot compare the endpoint to the table')
    process.exit(1)
  }
  const H = { apikey: K, Authorization: `Bearer ${K}` }
  /* Every network call here is wrapped. A gate that dies on a connect timeout
     is a gate that gets removed from the pipeline; it should say the endpoint
     was unreachable and fail like any other failure. */
  const tryFetch = async (url, init) => {
    try {
      return { res: await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20_000) }) }
    } catch (e) {
      return { err: e instanceof Error ? e.message : String(e) }
    }
  }
  const db = async (q) => {
    const { res, err } = await tryFetch(`${U}/rest/v1/${q}`, { headers: H })
    if (err || !res.ok) { console.error(`✗ could not read daily_prices — ${err ?? res.status}`); process.exit(1) }
    return res.json()
  }

  /* The tickers that traded in the most recent session — the ones where a
     frozen cache shows up first. A thin name that has not traded for a month
     would agree with a stale copy and prove nothing. */
  const [{ date: latest } = {}] = await db('daily_prices?select=date&order=date.desc&limit=1')
  if (!latest) { console.error('✗ daily_prices is empty'); process.exit(1) }
  const recent = await db(
    `daily_prices?select=ticker,close&date=eq.${latest}&close=gt.0&order=volume.desc&limit=6`)

  console.log(`  latest session in daily_prices: ${latest}`)
  for (const row of recent) {
    const sym = row.ticker
    const { res: chartRes, err } = await tryFetch(`${BASE}/api/chart/${sym}`)
    if (err || !chartRes.ok) { ok(`${sym} · endpoint reachable`, false, err ?? `HTTP ${chartRes.status}`); continue }
    const served = await chartRes.json().catch(() => null)
    if (!Array.isArray(served) || !served.length) {
      ok(`${sym} · endpoint returns a series`, false, JSON.stringify(served).slice(0, 120))
      continue
    }
    const last = served[served.length - 1]
    const { res: head } = await tryFetch(
      `${U}/rest/v1/daily_prices?select=date&ticker=eq.${sym}`,
      { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } })
    const total = Number(head?.headers.get('content-range')?.split('/')[1] ?? -1)
    const [dbLast] = await db(`daily_prices?select=date,close&ticker=eq.${sym}&order=date.desc&limit=1`)

    ok(`${sym} · last bar is the last session in the table`,
      last.date === dbLast?.date && last.close === dbLast?.close,
      `served ${last.date} @ ${last.close}, table ${dbLast?.date} @ ${dbLast?.close}`)
    /* Count as well as tail: the 1,000-row PostgREST cap truncates the MIDDLE
       of a paginated read without touching the end. */
    ok(`${sym} · whole series is served`, served.length === total,
      `served ${served.length} of ${total} rows`)
  }
}

if (failed) { console.error(`✗ ${failed} chart freshness check(s) failed`); process.exit(1) }
console.log('✓ charts are as current as the data')
