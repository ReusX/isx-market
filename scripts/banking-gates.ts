/**
 * Banking data gates.
 *
 *   npx tsx scripts/banking-gates.ts
 *
 * Two kinds of check, deliberately mixed:
 *
 *   INVARIANT  probes the live database by trying to insert something illegal
 *              and requiring the write to fail. A constraint nobody has ever
 *              seen reject anything is a comment, not a constraint.
 *   INTEGRITY  reads what is actually stored and asserts it is coherent.
 *
 * Everything the probes create is removed, including on failure.
 */

import {
  FACT_KEYS, FACT_STATES, CONDITION_FIELDS, CONDITION_OPS, conditionHash,
} from '../lib/banking'
import { PILOT_BANKS } from './data/banks-pilot'

const U = process.env.NEXT_PUBLIC_SUPABASE_URL
const K = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: K!, Authorization: `Bearer ${K!}`, 'Content-Type': 'application/json' }

let failed = 0
const ok = (name: string, pass: boolean, detail = '') => {
  if (!pass) failed++
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(`${U}/rest/v1/${path}`, { headers: H })
  return (await r.json()) as T
}

/** Try to write something illegal. The gate passes when the database says no. */
async function rejects(name: string, table: string, body: unknown): Promise<void> {
  const r = await fetch(`${U}/rest/v1/${table}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  const text = await r.text()
  if (r.ok) {
    /* It got in. Clean up before failing, so a bad gate does not also leave
       bad data behind. */
    const rows = JSON.parse(text || '[]') as { id?: number }[]
    for (const row of rows) if (row.id) await fetch(`${U}/rest/v1/${table}?id=eq.${row.id}`, { method: 'DELETE', headers: H })
    ok(name, false, 'the write SUCCEEDED')
  } else {
    ok(name, true, `${r.status}`)
  }
}

async function main() {
  if (!U || !K) { console.error('✗ Supabase env not set'); process.exit(1) }
  console.log('banking data gates')

  // ── vocabulary parity ───────────────────────────────────────────────────
  const policy = await get<{ field_key: string }[]>('fact_policy?select=field_key')
  const cf = await get<{ field_key: string }[]>('condition_field?select=field_key')
  const co = await get<{ op: string }[]>('condition_operator?select=op')
  const dbFacts = new Set(policy.map((r) => r.field_key))
  const dbFields = new Set(cf.map((r) => r.field_key))
  const dbOps = new Set(co.map((r) => r.op))
  ok('fact keys in code all exist in fact_policy',
    FACT_KEYS.every((k) => dbFacts.has(k)),
    FACT_KEYS.filter((k) => !dbFacts.has(k)).join(', '))
  ok('condition fields in code all exist in condition_field',
    CONDITION_FIELDS.every((k) => dbFields.has(k)),
    CONDITION_FIELDS.filter((k) => !dbFields.has(k)).join(', '))
  ok('operators in code all exist in condition_operator',
    CONDITION_OPS.every((k) => dbOps.has(k)))

  // ── invariants the database must enforce ────────────────────────────────
  const [prod] = await get<{ id: number }[]>('bank_products?select=id&limit=1')
  const [bank] = await get<{ id: number }[]>('banks?select=id&limit=1')
  const base = { product_id: prod.id, field_key: 'rate', condition_hash: '__gate__' }

  await rejects('KNOWN fact without a source or verified date is rejected',
    'product_facts', { ...base, state: 'KNOWN', value_num: 5 })
  await rejects('an invalid state value is rejected',
    'product_facts', { ...base, state: 'PROBABLY', value_num: 5 })
  await rejects('UNKNOWN carrying a value is rejected',
    'product_facts', { ...base, state: 'UNKNOWN', value_num: 5 })
  await rejects('a fact key outside the vocabulary is rejected',
    'product_facts', { ...base, field_key: 'made_up_key', state: 'UNKNOWN' })
  await rejects('a product referencing a missing bank is rejected',
    'bank_products', { bank_id: 999_999_999, slug: 'gate', kind: 'loan_personal', name_ar: 'x', name_en: 'x' })
  await rejects('a product kind outside the vocabulary is rejected',
    'bank_products', { bank_id: bank.id, slug: 'gate2', kind: 'crypto_loan', name_ar: 'x', name_en: 'x' })
  await rejects('a service availability outside the three states is rejected',
    'bank_services', { bank_id: bank.id, service_key: 'atm', availability: 'probably' })
  await rejects('an available service without provenance is rejected',
    'bank_services', { bank_id: bank.id, service_key: 'cards', availability: 'available' })

  // condition vocabulary — needs a real fact to hang off
  const mk = await fetch(`${U}/rest/v1/product_facts`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...base, state: 'UNKNOWN' }),
  })
  const [tmp] = (await mk.json()) as { id: number }[]
  await rejects('a condition field outside the vocabulary is rejected',
    'product_conditions', { fact_id: tmp.id, field_key: 'star_sign', op: 'eq', value_text: 'leo' })
  await rejects('an operator outside the vocabulary is rejected',
    'product_conditions', { fact_id: tmp.id, field_key: 'salary', op: 'approximately', value_num: 1 })

  // one current version per product/field/conditions
  await rejects('two current facts for the same product, field and conditions are rejected',
    'product_facts', { ...base, state: 'UNKNOWN' })
  await fetch(`${U}/rest/v1/product_facts?id=eq.${tmp.id}`, { method: 'DELETE', headers: H })

  // ── integrity of what is actually stored ────────────────────────────────
  const cur = await get<any[]>('product_facts_current?select=state,source_id,verified_at,field_key,is_stale,stale_after&limit=1000')
  ok('no KNOWN fact in the current view lacks provenance',
    cur.every((f) => f.state !== 'KNOWN' || (f.source_id && f.verified_at)))
  ok('every current fact has a freshness horizon',
    cur.every((f) => f.state !== 'KNOWN' || f.stale_after))

  const superseded = await get<any[]>('product_facts?select=id&superseded_at=not.is.null&limit=1000')
  const curIds = new Set((await get<any[]>('product_facts_current?select=id&limit=2000')).map((r) => r.id))
  ok('the current view cannot expose a superseded fact',
    superseded.every((r) => !curIds.has(r.id)),
    `${superseded.length} superseded rows exist`)

  const banks = await get<any[]>('banks?select=slug,ticker')
  const fs = await import('node:fs')
  const roster = JSON.parse(fs.readFileSync('public/data/companies.json', 'utf8')) as { sym: string; sec?: string }[]
  const rosterBanks = new Set(roster.filter((c) => c.sec === 'BANK').map((c) => c.sym))
  ok('every ticker on a bank is a BANK in the curated roster',
    banks.every((b) => !b.ticker || rosterBanks.has(b.ticker)),
    banks.filter((b) => b.ticker && !rosterBanks.has(b.ticker)).map((b) => b.slug).join(', '))

  // ── the seed itself ─────────────────────────────────────────────────────
  const seedFacts = PILOT_BANKS.flatMap((b) => (b.products ?? []).flatMap((p) => p.facts))
  ok('no unsourced commercial claim in the seed',
    seedFacts.every((f) => f.state !== 'KNOWN' || (f.sourceKey && f.verifiedAt && f.excerpt)))
  ok('every KNOWN seed fact quotes the source text',
    seedFacts.every((f) => f.state !== 'KNOWN' || (f.excerpt ?? '').length > 3))
  ok('the unknown / unchecked distinction is actually used',
    seedFacts.some((f) => f.state === 'UNKNOWN') && seedFacts.some((f) => f.state === 'NOT_APPLICABLE'))
  ok('condition hashing is order-independent',
    conditionHash([{ field: 'salary', op: 'gt', value: 1 }, { field: 'age', op: 'lte', value: 60 }]) ===
    conditionHash([{ field: 'age', op: 'lte', value: 60 }, { field: 'salary', op: 'gt', value: 1 }]))
  ok('every state in the seed is a known state',
    seedFacts.every((f) => (FACT_STATES as readonly string[]).includes(f.state)))

  // ── the stale report answers ────────────────────────────────────────────
  const stale = await get<any[]>('bank_facts_stale?select=bank_slug,field_key,days_overdue&limit=20')
  ok('the stale report runs', Array.isArray(stale), `${stale.length} facts overdue today`)

  if (failed) { console.error(`✗ ${failed} banking gate(s) failed`); process.exit(1) }
  console.log('✓ banking gates pass')
}

main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1) })
