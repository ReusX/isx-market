/**
 * Load the bank seed: 79 reconciled CBI-directory entries.
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

import { BANK_SOURCES } from './data/banks-pilot'
import { ALL_BANKS, PRODUCT_SOURCES } from './data/banks-all'
import { checkFact, conditionHash, type BankIdentity, type FactSeed } from '../lib/banking'
import RESEARCH from './data/research/iraq-bank-research.json'

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

function validate(banks: readonly BankIdentity[]): string[] {
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

async function checkTickers(banks: readonly BankIdentity[]): Promise<string[]> {
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

/**
 * Every source the seed can cite, registered once.
 *
 * The research handoff carries 115 sources; only the ones a published fact
 * actually cites are registered, so `data_sources` stays a registry of things
 * this site stands behind rather than a copy of a research bibliography.
 */
async function sourceIds(): Promise<Map<string, number>> {
  const cited = new Set<string>()
  for (const b of ALL_BANKS) {
    if (b.licenceSourceKey) cited.add(b.licenceSourceKey)
    for (const svc of b.services ?? []) if (svc.sourceKey) cited.add(svc.sourceKey)
    for (const p of b.products ?? []) for (const f of p.facts) if (f.sourceKey) cited.add(f.sourceKey)
  }
  const research = RESEARCH as {
    sources: { id: number; title: string; url: string; kind: string; observed_at: string; note?: string }[]
  }
  for (const r of research.sources) {
    const key = `research-${r.id}`
    if (!cited.has(key)) continue
    await rest('data_sources?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        key, name_ar: r.title, name_en: r.title, url: r.url,
        /* An indexed or secondary source is registered as what it is. A cached
           copy of a bank's own page is not the bank's own page. */
        kind: /OFFICIAL$/.test(r.kind) ? 'official' : r.kind.includes('INDEXED') ? 'official' : 'secondary',
        reliability: r.kind === 'OFFICIAL' ? 'high' : 'medium',
        notes: r.note || null,
      }),
    })
  }
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
    unit: f.unit ?? null,
    value_text: f.text ?? null,
    value_text_en: f.textEn ?? null,
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
    note_en: f.noteEn ?? null,
    retrieved_at: new Date().toISOString(),
  }
}

/** Same value, same state, same conditions → nothing to do. */
function unchanged(live: Row, next: Row): boolean {
  const keys = ['value_num', 'unit', 'value_text', 'value_text_en', 'value_bool', 'state', 'source_id', 'source_url', 'note', 'note_en']
  return keys.every((k) => String(live[k] ?? '') === String(next[k] ?? ''))
}

async function main() {
  const problems = [...validate(ALL_BANKS), ...(await checkTickers(ALL_BANKS))]
  if (problems.length) {
    console.error(`✗ ${problems.length} seed problem(s)`)
    problems.forEach((p) => console.error('  ·', p))
    process.exit(1)
  }
  const facts = ALL_BANKS.flatMap((b) => (b.products ?? []).flatMap((p) => p.facts))
  console.log(
    `✓ seed valid — ${ALL_BANKS.length} banks ` +
    `(${ALL_BANKS.filter((b) => b.ticker).length} listed, ` +
    `${ALL_BANKS.filter((b) => b.products?.length).length} with products: ` +
    `${PRODUCT_SOURCES.pilot.length} read by hand, ${PRODUCT_SOURCES.curated.length} curated from research), ` +
    `${ALL_BANKS.reduce((n, b) => n + (b.products?.length ?? 0), 0)} products, ` +
    `${facts.length} facts (${facts.filter((f) => f.state === 'KNOWN').length} known, ` +
    `${facts.filter((f) => f.state === 'UNKNOWN').length} unknown), ` +
    `${facts.filter((f) => f.when?.length).length} conditional`,
  )
  if (CHECK) return
  if (!URL_BASE || !KEY) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1) }

  const src = await sourceIds()
  let inserted = 0, superseded = 0, held = 0, retired = 0

  for (const b of ALL_BANKS) {
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
        operating_status: b.operatingStatus ?? 'operating',
        usd_restricted: b.usdRestricted ?? null,
        status_note_ar: b.statusNoteAr ?? null,
        status_note_en: b.statusNoteEn ?? null,
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
      /* Every live fact for this product, fetched once. The per-fact lookup
         used to filter on `condition_hash=eq.` in the URL, which does not match
         an EMPTY string in PostgREST — so unconditional facts always looked
         absent, the loader reported them as new when it had in fact superseded
         one, and its own counts could not be trusted. Matching in JS removes
         the encoding question and a request per fact. */
      const liveAll = await rest<Row[]>(`product_facts?select=*&product_id=eq.${prod.id}&superseded_at=is.null`)
      const liveByKey = new Map(liveAll.map((r) => [`${r.field_key}|${r.condition_hash}`, r]))
      for (const row of liveAll) {
        if (declared.has(`${row.field_key}|${row.condition_hash}`)) continue
        await rest(`product_facts?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ superseded_at: new Date().toISOString() }) })
        retired++
      }

      for (const f of p.facts) {
        const next = factRow(prod.id, f, src)
        const live = liveByKey.get(`${f.key}|${String(next.condition_hash)}`)
        if (live && unchanged(live, next)) { held++; continue }
        if (live) {
          await rest(`product_facts?id=eq.${live.id}`, { method: 'PATCH', body: JSON.stringify({ superseded_at: new Date().toISOString() }) })
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
