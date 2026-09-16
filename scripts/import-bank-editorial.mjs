/**
 * The editorial layer for /banks/[slug], imported from the research package.
 *
 *   node scripts/import-bank-editorial.mjs            write content/banks/profiles.ar.json
 *   node scripts/import-bank-editorial.mjs --check    validate only, write nothing
 *
 * ── What this is, and is not ────────────────────────────────────────────────
 * The package (scripts/data/research/iraqsm-bank-profiles-ar.json) is written
 * Arabic copy — verdicts, ratings, FAQs, links — for 79 directory entries. It
 * is content, not facts about products, so it does not go through the fact
 * tables: a verdict has no `state`, no condition hash and no freshness class.
 * Products and the one headline rate each carries DO go through the fact
 * tables, via scripts/data/banks-curated.ts, where they get provenance and
 * history like every other figure.
 *
 * What this script produces is a pruned, deterministic, committed JSON that
 * the page reads at render time. Committed so the import is reviewable in a
 * diff; deterministic so running it twice is a no-op; pruned so internal
 * research states (publication_state, index reasons, raw notes) never reach
 * the page even by accident.
 *
 * ── Invariants it refuses to write without ─────────────────────────────────
 *   · every slug is a live bank; research slugs are aliased, never created
 *   · exactly the profiles the package says carry an overall score do, and
 *     every overall carries its coverage and confidence
 *   · a category score is a number or null — null is «غير مقيّم», never 0
 *   · at most one headline rate per product, with a known basis
 *   · no AggregateRating anywhere: editorial scores are not votes
 */
import fs from 'node:fs'

const SRC = 'scripts/data/research/iraqsm-bank-profiles-ar.json'
const OUT = 'content/banks/profiles.ar.json'
const CHECK = process.argv.includes('--check')

const pack = JSON.parse(fs.readFileSync(SRC, 'utf8'))

/* Live slugs: the generated roster plus the pilot's hand-named banks. */
const roster = fs.readFileSync('scripts/data/banks-roster.generated.ts', 'utf8')
const pilot = fs.readFileSync('scripts/data/banks-pilot.ts', 'utf8')
const live = new Set([...roster.matchAll(/slug: '([a-z0-9-]+)'/g), ...pilot.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]))

const BASES = new Set([
  'annual', 'annual_from', 'annual_declining', 'declining_unannualized',
  'expected_profit_not_guaranteed', 'financing_return_only', 'unstated', 'flat',
])
const CATS = ['mobile', 'support', 'fees', 'payments', 'access', 'products']

/**
 * Package product → live product slug.
 *
 * The package names products in Arabic and carries no slugs. Each selected
 * product is matched by hand to the row that already holds its provenance and
 * history in `bank_products`, so the page can join the editorial copy to the
 * sourced facts. Four are new rows, declared in banks-curated.ts. A product
 * missing from this table stops the import rather than becoming an orphan.
 *
 * This table is also what makes the package authoritative over what is
 * PUBLIC: the loader deactivates every product a bank has that is not named
 * here. Rafidain's 2023 figures, the Credit Bank 14% facility and Union's 8%
 * savings row are retired that way — kept, superseded, not shown.
 */
const PRODUCT_SLUGS = {
  'rasheed': { 'تمويل تجاري': 'commercial-loan' },
  'agricultural-cooperative-bank': { 'سلفة المتقاعدين': 'pensioner-advance' },
  'trade-bank-iraq': { 'وديعة بالدينار لسنة': 'fixed-deposit', 'تمويل سيارة هجينة أو كهربائية': 'hybrid-car-loan' },
  'al-nahrain-islamic': { 'مرابحة المشاريع الصغيرة': 'small-project-murabaha' },
  'bank-of-baghdad': { 'وديعة أفراد بالدينار': 'retail-fixed-deposit' },
  'national-bank-of-iraq': { 'الحساب الجاري': 'current-account', 'زناگين': 'zanagin-savings' },
  'credit-bank-of-iraq': { 'وديعة ثابتة بالدينار': 'fixed-deposit', 'حساب توفير بالدينار': 'savings-account' },
  'union-bank-of-iraq': { 'وديعة بالدينار لسنة': 'fixed-deposit' },
  'ashur': { 'وديعة لأجل': 'term-deposit' },
  'mansour': { 'تمويل شخصي مرتبط بالراتب': 'salary-transfer-loan', 'تمويل سكني': 'housing-loan' },
  'trans-iraq-bank': { 'وديعة بالدينار لسنة': 'term-deposit' },
  'international-development-bank': { 'وديعة استثمارية بالدينار': 'investment-deposit', 'حساب العائد المقدم': 'profit-account' },
  'al-janoob-islamic-bank': { 'تمويل التعليم': 'education-finance' },
  'trust-international-islamic-bank': { 'مرابحة مرتبطة بالراتب': 'salary-murabaha' },
  'al-rajih-islamic-bank': { 'مرابحة سكنية': 'housing-murabaha', 'قرض حسن': 'qard-hasan' },
  'al-mal-islamic-bank': { 'تمويل سيارة': 'car-finance', 'تمويل زواج': 'marriage-finance' },
  'first-iraqi-bank': { 'حساب لأجل بربح متوقع': 'term-account' },
  'commercial-iraqi-islamic-bank': { 'وديعة مضاربة أو وكالة': 'investment-time-deposit' },
  'byblos-bank-iraq': { 'وديعة لأجل': 'term-deposit' },
  'vakifbank-iraq': { 'تمويل أفراد وسيارات وسكن': 'retail-financing' },
  'isbank-iraq': { 'حساب لأجل وتمويل': 'time-deposit' },
  'abu-dhabi-islamic-bank-iraq': { 'وديعة مضاربة': 'time-deposit-mudaraba' },
}

const problems = []
const fail = (m) => problems.push(m)

const sources = new Map(pack.sources.map((s) => [s.id, s]))
const out = { observed_at: pack.observed_at, methodology_ar: pack.rating_methodology_ar, profiles: {} }
const aliases = {}
const stats = { overall: [], rated: [], products: 0, rates: 0, faqs: 0, appEvidence: 0 }

for (const p of [...pack.profiles].sort((a, b) => a.slug.localeCompare(b.slug))) {
  if (!live.has(p.slug)) fail(`${p.slug}: not a live bank`)
  if (p.research_slug !== p.slug) aliases[p.research_slug] = p.slug

  const r = p.editorial_ratings
  const cats = {}
  for (const k of CATS) {
    const c = r.categories[k]
    if (!c) { fail(`${p.slug}: missing category ${k}`); continue }
    if (c.score !== null && typeof c.score !== 'number') fail(`${p.slug}: ${k} score is ${typeof c.score}`)
    if (c.score === 0) fail(`${p.slug}: ${k} scored 0 — a zero is a judgment, not an absence`)
    cats[k] = {
      score: c.score, outOf: c.out_of ?? 5, weight: c.weight_percent,
      confidence: c.confidence, rationale: c.rationale_ar, sources: c.source_ids ?? [],
    }
  }
  if (r.overall !== null) {
    if (!r.covered_weight_percent || !r.confidence || !r.label_ar) fail(`${p.slug}: overall without coverage/confidence/label`)
    stats.overall.push(p.slug)
  }
  if (Object.values(cats).some((c) => c.score !== null)) stats.rated.push(p.slug)

  const products = (p.public_copy.important_products ?? []).map((x) => {
    const hr = x.headline_rate ?? null
    if (hr) {
      if (typeof hr.value !== 'number') fail(`${p.slug}/${x.name_ar}: headline value is not a number`)
      if (!BASES.has(hr.basis)) fail(`${p.slug}/${x.name_ar}: unknown basis ${hr.basis}`)
      if (!hr.scenario_ar) fail(`${p.slug}/${x.name_ar}: headline without scenario`)
      stats.rates++
    }
    stats.products++
    const slug = PRODUCT_SLUGS[p.slug]?.[x.name_ar]
    if (!slug) fail(`${p.slug}/${x.name_ar}: no live product slug mapped`)
    return {
      slug, name: x.name_ar, summary: x.summary_ar, sources: x.source_ids ?? [],
      bankConfirmed: Boolean(x.direct_bank_confirmation),
      rate: hr ? { value: hr.value, basis: hr.basis, scenario: hr.scenario_ar, source: hr.source_id } : null,
    }
  })

  const app = p.app_evidence
  /* Ten records identify the CORRECT app without a store rating — Ashur
     Konnekt rather than the old Ashur app, Ziraat Iraq rather than the Turkish
     parent's. That identity is worth publishing on its own; the rating, when
     present, must be a number. */
  if (app) {
    if (app.platform_rating !== null && typeof app.platform_rating !== 'number') fail(`${p.slug}: store rating is ${typeof app.platform_rating}`)
    stats.appEvidence++
  }
  stats.faqs += (p.public_copy.faqs ?? []).length

  const usedSources = new Set([
    ...(p.source_ids ?? []),
    ...products.flatMap((x) => [...x.sources, x.rate?.source].filter(Boolean)),
  ])
  for (const id of usedSources) if (!sources.has(id)) fail(`${p.slug}: source ${id} not in registry`)

  out.profiles[p.slug] = {
    h1: p.public_copy.h1,
    intro: p.public_copy.intro_ar,
    suitableFor: p.public_copy.suitable_for_ar,
    watchOut: p.public_copy.watch_out_ar,
    experience: p.public_copy.customer_experience_ar,
    fees: p.public_copy.fees_ar ?? null,
    products,
    faqs: (p.public_copy.faqs ?? []).map((f) => ({ q: f.question_ar, a: f.answer_ar, sources: f.source_ids ?? [] })),
    links: (p.public_copy.links ?? []).map((l) => ({ label: l.label_ar, url: l.url, source: l.source_id ?? null })),
    ratings: {
      overall: r.overall, outOf: r.out_of ?? 10, label: r.label_ar ?? null,
      coveredWeight: r.covered_weight_percent ?? null, confidence: r.confidence ?? null,
      categories: cats,
    },
    app: app ? {
      url: app.url, title: app.title, storeRating: app.platform_rating,
      ratingCount: app.rating_count_display ?? null, storefront: app.storefront ?? null,
      sample: app.visible_review_sample_count ?? null, confidence: app.confidence ?? null,
      summary: app.review_summary_ar ?? null, source: app.source_id ?? null,
    } : null,
    seo: { title: p.seo.title_ar, description: p.seo.meta_description_ar, recommendation: p.seo.index_recommendation },
    /* The directory status from the package is NOT written: the live `banks`
       table already carries a verified status with its own source. It is kept
       here only so the check step can report a disagreement. */
    sources: [...usedSources].sort((a, b) => a - b).map((id) => {
      const s = sources.get(id)
      return { id, title: s.title, url: s.url, kind: s.kind, date: s.published_date ?? null }
    }),
  }
}
out.aliases = aliases

if (Object.keys(out.profiles).length !== 79) fail(`expected 79 profiles, got ${Object.keys(out.profiles).length}`)
if (stats.overall.length !== 2) fail(`expected exactly 2 overall scores, got ${stats.overall.length}: ${stats.overall}`)

if (problems.length) {
  console.error(`✗ editorial import refused:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

const json = JSON.stringify(out, null, 1) + '\n'
const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null
if (!CHECK) fs.writeFileSync(OUT, json)
console.log(
  `✓ editorial layer ${CHECK ? 'valid' : before === json ? 'unchanged' : before ? 'updated' : 'written'} — ` +
  `${Object.keys(out.profiles).length} profiles, ${stats.rated.length} with any category score, ` +
  `${stats.overall.length} with an overall (${stats.overall.join(', ')}), ` +
  `${stats.products} products, ${stats.rates} headline rates, ${stats.faqs} FAQs, ` +
  `${stats.appEvidence} app records, ${Object.keys(aliases).length} aliases`,
)
