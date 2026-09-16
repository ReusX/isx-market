/**
 * One-off: fill `foreign_flow_daily` (session totals per side) from the
 * per-company rows for every session the totals table is missing. The daily
 * cron now writes both; this closes the gap behind it.
 *
 *   npx tsx scripts/backfill-foreign-daily.ts [--since YYYY-MM-DD]
 *
 * Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(url, key, { auth: { persistSession: false } })
const since = process.argv.includes('--since') ? process.argv[process.argv.indexOf('--since') + 1] : '2010-01-01'

async function main() {
  const have = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('foreign_flow_daily').select('date,side').gte('date', since).order('date').range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) have.add(`${r.date}|${r.side}`)
    if (!data || data.length < 1000) break
  }
  const totals = new Map<string, { date: string; year: number; month: number; side: string; trades: number; volume: number; value: number }>()
  let read = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('foreign_flow_company_daily').select('date,side,trades,volume,value').gte('date', since).order('date').range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) {
      read++
      const k = `${r.date}|${r.side}`
      if (have.has(k)) continue
      const t = totals.get(k) ?? { date: r.date, year: Number(r.date.slice(0, 4)), month: Number(r.date.slice(5, 7)), side: r.side, trades: 0, volume: 0, value: 0 }
      t.trades += r.trades ?? 0; t.volume += Number(r.volume ?? 0); t.value += Number(r.value ?? 0)
      totals.set(k, t)
    }
    if (!data || data.length < 1000) break
  }
  const rows = Array.from(totals.values())
  console.log(`read ${read} company rows · ${have.size} totals already present · ${rows.length} to write`)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from('foreign_flow_daily').upsert(rows.slice(i, i + 500), { onConflict: 'date,side' })
    if (error) throw error
  }
  console.log('done')
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1) })
