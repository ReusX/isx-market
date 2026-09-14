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
import { isCurrentEnough } from '../lib/banks'

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
  const cur = await get<any[]>('product_facts_current?select=state,source_id,source_url,verified_at,field_key,is_stale,stale_after&limit=1000')
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

  // ── UNKNOWN must be a claim about a source, not an empty field ──────────
  const unknowns = cur.filter((f: any) => f.state === 'UNKNOWN')
  ok('every UNKNOWN names the page that was checked and when',
    unknowns.every((f: any) => f.source_url && f.verified_at),
    `${unknowns.length} UNKNOWN facts`)

  const banksAll = await get<any[]>('banks?select=slug,research_state,research_note,website')
  ok('every bank declares how far research got',
    banksAll.every((b) => ['researched', 'source_unreachable', 'not_researched'].includes(b.research_state)))
  /* A bank we could not reach must not also be claiming a reachable website —
     that is the combination that would let the page imply we read it.
     The REASON no longer has to be a per-bank note: `source_unreachable`
     renders the explanation from the dictionary, so eleven identical rows of
     boilerplate in the database would add nothing. What must hold is that such
     a bank offers no website and cannot be published as a researched profile. */
  const unreachable = banksAll.filter((b) => b.research_state === 'source_unreachable')
  ok('an unreachable bank carries no website',
    unreachable.every((b) => !b.website),
    `${unreachable.length} unreachable`)

  // ── the new status dimensions ───────────────────────────────────────────
  const statuses = await get<any[]>('banks?select=slug,operating_status,usd_restricted,ticker')
  ok('every bank carries a known operating status',
    statuses.every((b) => ['operating', 'establishment', 'guardianship', 'liquidation'].includes(b.operating_status)))
  /* `false` would be a claim that a bank is NOT restricted, and the absence of
     a directory annotation does not establish that. Only true or null. */
  ok('usd_restricted is true or unknown, never a bare false',
    statuses.every((b) => b.usd_restricted === true || b.usd_restricted === null),
    `${statuses.filter((b) => b.usd_restricted).length} restricted`)

  // ── one headline rate per product ───────────────────────────────────────
  /* The rule the whole curation layer exists to enforce: a product shows ONE
     selected scenario. Two KNOWN rate facts on one product would put a range
     or a wall of tiers back on the page. */
  const rates = await get<any[]>(
    'product_facts_current?select=product_id,field_key,state,value_num&field_key=eq.rate&state=eq.KNOWN&limit=1000')
  const perProduct = new Map<number, number>()
  for (const r of rates) perProduct.set(r.product_id, (perProduct.get(r.product_id) ?? 0) + 1)
  const multi = Array.from(perProduct.entries()).filter(([, n]) => n > 1)
  ok('no product publishes more than one rate',
    multi.length === 0,
    multi.length ? `product ids ${multi.map(([id, n]) => `${id}×${n}`).join(', ')}` : `${rates.length} published rates`)

  /* A percentage without a basis is not a price. Either the bank states the
     basis (KNOWN) or the page says it does not (UNKNOWN) — never absent. */
  const allCur = await get<any[]>('product_facts_current?select=product_id,field_key,state&limit=2000')
  const basisOf = new Map<number, string>()
  for (const f of allCur) if (f.field_key === 'rate_basis') basisOf.set(f.product_id, f.state)
  const ratedProducts = rates.filter((r) => (r.value_num ?? 0) > 0).map((r) => r.product_id)
  ok('every published rate above zero says what it is calculated on',
    ratedProducts.every((id) => basisOf.has(id)),
    ratedProducts.filter((id) => !basisOf.has(id)).join(', '))

  // ── age, and the difference between reading and publishing ──────────────
  /* `verified_at` is when we read the page; `effective_date` is when the
     source published the figure. Every Rafidain rate sits on a page stamped
     2023, and reading it in 2026 does not make it current — so a dated figure
     older than a year must carry the note that explains its demotion. */
  const YEAR_MS = 365 * 86_400_000
  const datedRates = (await get<any[]>(
    'product_facts_current?select=id,field_key,state,effective_date,note,note_en&field_key=eq.rate&state=eq.KNOWN&effective_date=not.is.null&limit=500'))
  const aged = datedRates.filter((f) => Date.now() - Date.parse(f.effective_date) > YEAR_MS)
  /* Asserted through the SAME predicate the profile and the JSON-LD use, so a
     parse or timezone bug that quietly made a 2023 date "current" would fail
     here rather than on the page. A note is not required: the date itself is
     what the page prints. */
  ok('no rate over a year old can be presented as current',
    aged.every((f) => !isCurrentEnough(f)) && datedRates.filter((f) => !aged.includes(f)).every((f) => isCurrentEnough(f)),
    `${aged.length} of ${datedRates.length} dated rates are over a year old and demoted`)

  /* A secondary source is allowed — a March 2026 press report beats a 2023
     official page — but only with the date and the attribution attached. */
  const secondary = await get<any[]>('data_sources?select=id,key&kind=eq.secondary')
  const secIds = new Set(secondary.map((r) => r.id))
  const secRates = (await get<any[]>(
    'product_facts_current?select=id,source_id,field_key,state,effective_date,note,note_en&field_key=eq.rate&state=eq.KNOWN&limit=500'))
    .filter((f) => secIds.has(f.source_id))
  ok('every rate from a secondary source is dated and attributed',
    secRates.every((f) => f.effective_date && f.note && f.note_en),
    `${secRates.length} secondary-sourced rates`)

  /* UNKNOWN is a finding about the source: "we read this page and the term is
     not on it". A fee we never looked for is UNVERIFIED, and it has to say so
     rather than leaving a reader to read "not checked" as "none". */
  const unver = await get<any[]>('product_facts_current?select=field_key,state,note,note_en&state=eq.UNVERIFIED&limit=500')
  ok('every unverified fact says what was not verified',
    unver.every((f) => f.note && f.note_en),
    `${unver.length} unverified facts`)

  // ── notes are copy, so they are bilingual ───────────────────────────────
  const noted = await get<any[]>('product_facts_current?select=id,note,note_en&note=not.is.null&limit=1000')
  ok('every fact note has an English rendering',
    noted.every((f) => f.note_en),
    `${noted.length} notes, ${noted.filter((f) => !f.note_en).length} untranslated`)

  /* The source registry must not point at a domain someone parked.
     iraqiislamicbank.com looked exactly like the Iraqi Islamic Bank and is a
     domain-sale page; had it been cited, every fact under it would have been
     sourced to an advert. */
  const sources = await get<any[]>('data_sources?select=key,url')
  const parked: string[] = []
  for (const s of sources.filter((x) => x.url)) {
    try {
      const r = await fetch(s.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IraqSM/1.0)' }, signal: AbortSignal.timeout(15_000) })
      const t = (await r.text()).slice(0, 60_000)
      if (/spaceship\.com|domain (is )?for sale|buy this domain|parked/i.test(t)) parked.push(s.key)
    } catch { /* unreachable is not the same as parked; §5 covers that */ }
  }
  ok('no source in the registry is a parked domain', parked.length === 0, parked.join(', '))

  // ── the stale report answers ────────────────────────────────────────────
  const stale = await get<any[]>('bank_facts_stale?select=bank_slug,field_key,days_overdue&limit=20')
  ok('the stale report runs', Array.isArray(stale), `${stale.length} facts overdue today`)

  if (failed) { console.error(`✗ ${failed} banking gate(s) failed`); process.exit(1) }
  console.log('✓ banking gates pass')
}

main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1) })
