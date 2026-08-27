/**
 * Matching audit for the two depository datasets — §5 of the data brief.
 *
 *   npx tsx scripts/depository-audit.ts          summary
 *   npx tsx scripts/depository-audit.ts --rows   one line per source name
 *
 * Reads the live tables with the anon key, resolves every source company name
 * with the SAME code path the pages use, and prints the coverage the report
 * quotes. Nothing here is used at runtime; it exists so the numbers can be
 * re-derived rather than remembered.
 */
import fs from 'node:fs'
import { buildRoster, resolveSnapshot, type Resolution } from '../lib/depositoryNames'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Every row, not the first page — both tables are past the 1000-row default. */
async function all(table: string, select: string, filter = ''): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${U}/rest/v1/${table}?select=${select}${filter}`, {
      headers: { apikey: K, Authorization: `Bearer ${K}`, Range: `${from}-${from + 999}` },
    })
    const page = await r.json()
    out.push(...page)
    if (page.length < 1000) return out
  }
}

async function latestPeriod(table: string): Promise<{ year: number; month: number }> {
  const r = await fetch(`${U}/rest/v1/${table}?select=year,month&order=year.desc,month.desc&limit=1`,
    { headers: { apikey: K, Authorization: `Bearer ${K}` } })
  return (await r.json())[0]
}

async function main() {
  const rowsMode = process.argv.includes('--rows')

  const roster = buildRoster(
    JSON.parse(fs.readFileSync('public/data/companies.json', 'utf8')),
    await all('company_metrics', 'ticker,name_ar,name_en'),
  )
  console.log(`roster: ${roster.length} tickers carrying at least one Arabic match key\n`)

  for (const [table, col] of [['ownership_monthly', 'name_ar'], ['major_shareholders', 'company_name_ar']] as const) {
    const p = await latestPeriod(table)
    const rows = await all(table, `year,month,${col}`, `&year=eq.${p.year}&month=eq.${p.month}`)
    const leak = rows.filter(r => r.year !== p.year || r.month !== p.month).length
    const names = Array.from(new Set(rows.map((r: any) => r[col] as string)))
    const res = resolveSnapshot(names, roster)

    const method: Record<string, number> = {}, excluded: Record<string, number> = {}
    for (const r of Array.from(res.values())) {
      method[r.method] = (method[r.method] ?? 0) + 1
      if (r.excludedReason) excluded[r.excludedReason] = (excluded[r.excludedReason] ?? 0) + 1
    }
    const resolved = Array.from(res.values()).filter(r => r.sym).length
    const claimed = new Map<string, string[]>()
    for (const r of Array.from(res.values())) if (r.sym) claimed.set(r.sym, [...(claimed.get(r.sym) ?? []), r.source])

    console.log(`══ ${table} ══`)
    console.log(`  latest period        ${p.year}-${String(p.month).padStart(2, '0')}`)
    console.log(`  rows in that period  ${rows.length}   (older-period rows present: ${leak})`)
    console.log(`  distinct company names ${names.length}`)
    console.log(`  resolved             ${resolved}  (${(resolved / names.length * 100).toFixed(1)}%)`)
    console.log(`  unresolved           ${names.length - resolved}`)
    console.log(`  ambiguous            ${Array.from(res.values()).filter(r => r.ambiguous).length}`)
    console.log(`  two names → one ticker ${Array.from(claimed.values()).filter(v => v.length > 1).length}`)
    console.log(`  by method            ${JSON.stringify(method)}`)
    console.log(`  exclusion reasons    ${JSON.stringify(excluded)}\n`)

    if (rowsMode) {
      const w = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n)
      console.log(`  ${w('source', 40)}${w('sym', 6)}${w('canonical', 34)}${w('method', 22)}reason`)
      for (const r of Array.from(res.values()).sort((a, b) => a.method.localeCompare(b.method))) {
        console.log(`  ${w(r.source, 40)}${w(r.sym ?? '·', 6)}${w(r.canonical ?? '·', 34)}${w(r.method, 22)}${r.excludedReason ?? ''}`)
      }
      console.log()
    }
  }

}

main()
