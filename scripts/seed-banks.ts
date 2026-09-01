/**
 * Load the pilot bank seed.
 *
 *   npx tsx scripts/seed-banks.ts [--check]
 *
 * `--check` validates and reports without writing — the mode CI runs.
 *
 * ── Supersede, never overwrite ────────────────────────────────────────────
 * Re-running is safe and is how a changed term is recorded. A fact whose value
 * differs from the live one stamps the old row's `superseded_at` and inserts a
 * new row; an identical fact is left alone. A rate moving 6% → 7% therefore
 * leaves both rows readable, and the current view shows the 7%.
 *
 * ── Validated before written ──────────────────────────────────────────────
 * Every fact and condition is checked against the vocabulary in lib/banking.ts
 * first. The database enforces the same rules, but failing in the loader gives
 * a file and a field name instead of a constraint violation.
 */

import { PILOT_BANKS, BANK_SOURCES } from './data/banks-pilot'
import { checkFact, conditionHash, type BankSeed, type FactSeed } from '../lib/banking'

const CHECK = process.argv.includes('--check')
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const H = () => ({
  apikey: KEY!,
  Authorization: `Bearer ${KEY!}`,
  'Content-Type': 'application/json',
})

async function rest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...H(), ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${res.status} ${path.slice(0, 60)} — ${(await res.text()).slice(0, 200)}`)
  const t = await res.text()
  return (t ? JSON.parse(t) : []) as T
}

/* ── Validation ─────────────────────────────────────────────────────────── */

function validate(banks: readonly BankSeed[]): string[] {
  const problems: string[] = []
  const slugs = new Set<string>()
  const tickers = new Set<string>()
  for (const b of banks) {
    if (slugs.has(b.slug)) problems.push(`duplicate bank slug '${b.slug}'`)
    slugs.add(b.slug)
    if (b.ticker) {
      if (tickers.has(b.ticker)) problems.push(`duplicate ticker '${b.ticker}'`)
      tickers.add(b.ticker)
    }
    if (!b.pilotReason) problems.push(`${b.slug}: no pilotReason — say what edge case it tests`)
    const pslugs = new Set<string>()
    for (const p of b.products ?? []) {
      if (pslugs.has(p.slug)) problems.push(`${b.slug}: duplicate product slug '${p.slug}'`)
      pslugs.add(p.slug)
      /* Two facts of the same key and the same condition set would collide on
         the database's one-current index — better to say so here, with names. */
      const seen = new Map<string, number>()
      for (const f of p.facts) {
        const k = `${f.key}|${conditionHash(f.when)}`
        seen.set(k, (seen.get(k) ?? 0) + 1)
        problems.push(...checkFact(f).map((m) => `${b.slug}/${p.slug}: ${m}`))
      }
      for (const [k, n] of Array.from(seen.entries())) {
        if (n > 1) problems.push(`${b.slug}/${p.slug}: ${n} facts share key+conditions '${k}'`)
      }
    }
  }
  return problems
}

/* ── Ticker linkage against the curated roster ──────────────────────────── */

async function checkTickers(banks: readonly BankSeed[]): Promise<string[]> {
  const fs = await import('node:fs')
  const roster = JSON.parse(fs.readFileSync('public/data/companies.json', 'utf8')) as { sym: string; sec?: string }[]
  const known = new Map(roster.map((c) => [c.sym, c.sec]))
  const out: string[] = []
  for (const b of banks) {
    if (!b.ticker) continue
    if (!known.has(b.ticker)) out.push(`${b.slug}: ticker '${b.ticker}' is not in the curated roster`)
    else if (known.get(b.ticker) !== 'BANK') out.push(`${b.slug}: ticker '${b.ticker}' is not a BANK in the roster`)
  }
  return out
}

/* ── Write ──────────────────────────────────────────────────────────────── */

type Row = Record<string, unknown>

async function sourceIds(): Promise<Map<string, number>> {
  for (const s of BANK_SOURCES) {
    await rest('data_sources?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        key: s.key, name_ar: s.nameAr, name_en: s.nameEn, url: s.url,
        kind: 'official', reliability: 'high', notes: s.note ?? null,
      }),
    })
  }
  const rows = await rest<{ id: number; key: string }[]>('data_sources?select=id,key')
  return new Map(rows.map((r) => [r.key, r.id]))
}

function factRow(productId: number, f: FactSeed, src: Map<string, number>): Row {
  return {
    product_id: productId,
    field_key: f.key,
    value_num: f.num ?? null,
    value_text: f.text ?? null,
    value_bool: f.bool ?? null,
    state: f.state,
    condition_hash: conditionHash(f.when),
    source_id: f.sourceKey ? (src.get(f.sourceKey) ?? null) : null,
    source_url: f.sourceUrl ?? null,
    source_excerpt: f.excerpt ?? null,
    source_page: f.page ?? null,
    effective_date: f.effectiveDate ?? null,
    verified_at: f.verifiedAt ?? null,
    verified_by: f.verifiedAt ? 'seed' : null,
    note: f.note ?? null,
    retrieved_at: new Date().toISOString(),
  }
}

/** Same value, same state, same conditions → nothing to do. */
function unchanged(live: Row, next: Row): boolean {
  const keys = ['value_num', 'value_text', 'value_bool', 'state', 'source_id', 'source_url']
  return keys.every((k) => String(live[k] ?? '') === String(next[k] ?? ''))
}

async function main() {
  const problems = [...validate(PILOT_BANKS), ...(await checkTickers(PILOT_BANKS))]
  if (problems.length) {
    console.error(`✗ ${problems.length} seed problem(s)`)
    problems.forEach((p) => console.error('  ·', p))
    process.exit(1)
  }
  const facts = PILOT_BANKS.flatMap((b) => (b.products ?? []).flatMap((p) => p.facts))
  console.log(
    `✓ seed valid — ${PILOT_BANKS.length} banks, ` +
    `${PILOT_BANKS.reduce((n, b) => n + (b.products?.length ?? 0), 0)} products, ` +
    `${facts.length} facts (${facts.filter((f) => f.state === 'KNOWN').length} known, ` +
    `${facts.filter((f) => f.state === 'UNKNOWN').length} unknown), ` +
    `${facts.filter((f) => f.when?.length).length} conditional`,
  )
  if (CHECK) return
  if (!URL_BASE || !KEY) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1) }

  const src = await sourceIds()
  let inserted = 0, superseded = 0, held = 0, retired = 0

  for (const b of PILOT_BANKS) {
    await rest('banks?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        slug: b.slug, name_ar: b.nameAr, name_en: b.nameEn,
        short_ar: b.shortAr ?? null, short_en: b.shortEn ?? null,
        bank_type: b.bankType, ownership: b.ownership,
        founded: b.founded ?? null, hq_city: b.hqCity ?? null,
        website: b.website ?? null, swift: b.swift ?? null,
        ticker: b.ticker ?? null,
        research_state: b.researchState,
        research_note: b.researchNote ?? null,
        research_checked_at: b.researchCheckedAt ?? null,
        cbi_licensed: b.cbiLicensed ?? null,
        licence_source_id: b.licenceSourceKey ? (src.get(b.licenceSourceKey) ?? null) : null,
        licence_verified_at: b.licenceVerifiedAt ?? null,
        updated_at: new Date().toISOString(),
      }),
    })
    const [bank] = await rest<{ id: number }[]>(`banks?select=id&slug=eq.${b.slug}`)

    // services — three states, supersede on change
    for (const s of b.services ?? []) {
      const live = await rest<Row[]>(`bank_services?select=*&bank_id=eq.${bank.id}&service_key=eq.${s.key}&superseded_at=is.null`)
      const next: Row = {
        bank_id: bank.id, service_key: s.key, availability: s.availability,
        source_id: s.sourceKey ? (src.get(s.sourceKey) ?? null) : null,
        source_url: s.sourceUrl ?? null, source_excerpt: s.excerpt ?? null,
        verified_at: s.verifiedAt ?? null, note: s.note ?? null,
      }
      if (live[0] && String(live[0].availability) === s.availability) { held++; continue }
      if (live[0]) {
        await rest(`bank_services?id=eq.${live[0].id}`, { method: 'PATCH', body: JSON.stringify({ superseded_at: new Date().toISOString() }) })
        superseded++
      }
      await rest('bank_services', { method: 'POST', body: JSON.stringify(next) })
      inserted++
    }

    for (const p of b.products ?? []) {
      await rest('bank_products?on_conflict=bank_id,slug', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          bank_id: bank.id, slug: p.slug, kind: p.kind,
          name_ar: p.nameAr, name_en: p.nameEn,
          currency: p.currency ?? 'IQD',
          financing_type: p.financingType ?? 'conventional',
        }),
      })
      const [prod] = await rest<{ id: number }[]>(`bank_products?select=id&bank_id=eq.${bank.id}&slug=eq.${p.slug}`)

      /* Retire anything this product no longer declares.
         Supersede matches on (product, field_key, condition_hash), so RE-MODELLING
         a fact — the deposit tiers moved from `deposit_amount` to `term_months` —
         changes the hash and looks like a new fact rather than a replacement. The
         old rows stayed live and the product carried both models at once. A
         declarative seed has to retire what it stops declaring. */
      const declared = new Set(p.facts.map((f) => `${f.key}|${conditionHash(f.when)}`))
      const liveAll = await rest<Row[]>(`product_facts?select=id,field_key,condition_hash&product_id=eq.${prod.id}&superseded_at=is.null`)
      for (const row of liveAll) {
        if (declared.has(`${row.field_key}|${row.condition_hash}`)) continue
        await rest(`product_facts?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ superseded_at: new Date().toISOString() }) })
        retired++
      }

      for (const f of p.facts) {
        const next = factRow(prod.id, f, src)
        const hash = String(next.condition_hash)
        const live = await rest<Row[]>(
          `product_facts?select=*&product_id=eq.${prod.id}&field_key=eq.${f.key}` +
          `&condition_hash=eq.${encodeURIComponent(hash)}&superseded_at=is.null`,
        )
        if (live[0] && unchanged(live[0], next)) { held++; continue }
        if (live[0]) {
          await rest(`product_facts?id=eq.${live[0].id}`, { method: 'PATCH', body: JSON.stringify({ superseded_at: new Date().toISOString() }) })
          superseded++
        }
        const [row] = await rest<{ id: number }[]>('product_facts', {
          method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(next),
        })
        inserted++
        for (const c of f.when ?? []) {
          await rest('product_conditions', {
            method: 'POST',
            body: JSON.stringify({
              fact_id: row.id, field_key: c.field, op: c.op,
              value_num: typeof c.value === 'number' ? c.value : null,
              value_text: typeof c.value === 'string' ? c.value : null,
              value_bool: typeof c.value === 'boolean' ? c.value : null,
              value_set: c.set ? [...c.set] : null,
              note_ar: c.noteAr ?? null,
            }),
          })
        }
      }
    }
  }
  console.log(`✓ seeded — ${inserted} new, ${superseded} superseded, ${retired} retired, ${held} unchanged`)
}

main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1) })
