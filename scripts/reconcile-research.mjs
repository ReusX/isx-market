/**
 * Reconcile the CBI-directory research handoff against the canonical roster.
 *
 *   node scripts/reconcile-research.mjs            report only
 *   node scripts/reconcile-research.mjs --write     regenerate the identity file
 *
 * The research file carries 79 CBI directory entries. This turns them into
 * bank IDENTITIES only — name, class, ownership, status, website, services
 * that carry a source — and writes scripts/data/banks-roster.generated.ts.
 *
 * Two things it deliberately does NOT do:
 *
 *   · products. Which rate is publishable is a judgement about evidence, not a
 *     transform, so curated products live in scripts/data/banks-curated.ts by
 *     hand, with the reason recorded next to each.
 *   · ticker guessing. TICKERS below is a hand-verified map, checked against
 *     the Arabic name of every one of the 43 banks in the curated roster. A
 *     wrong ticker attaches another company's balance sheet to a bank profile,
 *     which is the worst single error this page could make, so it is not left
 *     to string similarity.
 */
import fs from 'node:fs'

const RESEARCH = 'scripts/data/research/iraq-bank-research.json'
const OUT = 'scripts/data/banks-roster.generated.ts'

/* research slug → ISX ticker. Verified name by name; see the header. */
const TICKERS = {
  'bank-of-baghdad': 'BBOB', 'iraqi-middle-east-investment-bank': 'BIME',
  'investment-bank-of-iraq': 'BIBI', 'national-bank-of-iraq': 'BNOI',
  'credit-bank-of-iraq': 'BROI', 'babylon-bank': 'BBAY',
  'economy-bank-for-investment-and-finance': 'BEFI', 'sumer-commercial-bank': 'BSUC',
  'gulf-commercial-bank': 'BGUC', 'mosul-bank-for-development-and-investment': 'BMFI',
  'north-bank-for-finance-and-investment': 'BNOR', 'union-bank-of-iraq': 'BUOI',
  'ashur-international-bank': 'BASH', 'al-mansour-bank-for-investment': 'BMNS',
  'trans-iraq-bank': 'BTRI', 'erbil-bank-for-investment-and-finance': 'BERI',
  'elaf-islamic-bank': 'BELF', 'kurdistan-international-islamic-bank': 'BKUI',
  'national-islamic-bank': 'BNAI', 'ataa-islamic-bank': 'BLAD',
  'cihan-islamic-bank': 'BCIH', 'al-janoob-islamic-bank': 'BJAB',
  'al-arabiya-islamic-bank': 'BAAI', 'noor-iraq-islamic-bank': 'BINI',
  'zain-iraq-islamic-bank': 'BZII', 'trust-international-islamic-bank': 'BTRU',
  'al-rajih-islamic-bank': 'BRAJ', 'al-qurtas-islamic-bank': 'BQUR',
  'asia-iraq-islamic-bank': 'BAIB', 'ameen-iraq-islamic-bank': 'BAME',
  'al-taif-islamic-bank': 'BTIB', 'region-trade-bank': 'BRTB',
  'al-mustashar-islamic-bank': 'BMUI', 'al-qabedh-islamic-bank': 'BQAB',
  'mashreq-al-arabi-islamic-bank': 'BAMS', 'united-bank-for-investment': 'BUND',
  'international-development-bank': 'BIDB', 'international-islamic-bank': 'BINT',
  'al-mal-islamic-bank': 'BMAL', 'iraqi-islamic-bank': 'BIIB',
  'al-ansari-islamic-bank': 'BANS', 'commercial-iraqi-islamic-bank': 'BCOI',
  'world-islamic-bank': 'BWOR',
}

/**
 * Slugs already live on the site win.
 *
 * /banks/ashur, /banks/cihan, /banks/mansour and /banks/trade-bank-iraq have
 * been published URLs since the pilot. The research file suggests longer slugs
 * for the same four institutions, and seeding those would create a second
 * profile for each bank — the duplicate the reconciliation exists to prevent —
 * while orphaning four indexable URLs. The research slug is the alias; the
 * live slug is canonical.
 */
const SLUG_CANONICAL = {
  'ashur-international-bank': 'ashur',
  'cihan-islamic-bank': 'cihan',
  'al-mansour-bank-for-investment': 'mansour',
  'trade-bank-of-iraq': 'trade-bank-iraq',
}

/* Dar Es Salaam Investment Bank is listed as BDSI, but companies.json files it
   under SVC rather than BANK. Assigning it here would break the roster gate and
   put a bank's financials behind a services-sector classification, so the
   ticker is withheld and the discrepancy is reported instead. */
const TICKER_WITHHELD = {
  'dar-es-salaam-investment-bank':
    'Listed as BDSI but classified SVC in the curated roster, not BANK. Ticker withheld until the roster sector is reconciled.',
}

/* The three state banks whose mandate is sectoral rather than commercial. */
const SPECIALISED = new Set(['industrial-bank', 'agricultural-cooperative-bank', 'real-estate-bank'])

const CITY_AR = {
  Baghdad: 'بغداد', Erbil: 'أربيل', Basra: 'البصرة', Basrah: 'البصرة',
  Mosul: 'الموصل', Sulaymaniyah: 'السليمانية', Najaf: 'النجف', Karbala: 'كربلاء',
  Duhok: 'دهوك', Dohuk: 'دهوك', Kirkuk: 'كركوك', Anbar: 'الأنبار', Babylon: 'بابل',
}

const SERVICE_KEY = {
  mobile_banking: 'mobile_banking', internet_banking: 'internet_banking',
  cards: 'cards', usd_accounts: 'usd_account',
  international_transfers: 'international_transfer',
  salary_domiciliation: 'salary_domiciliation',
}

/* "Baghdad, Rashid Street" is an address, not a city, and "Iraq; liquidation
   contact only" is not a place a reader can use. Only the city survives. */
function city(hq) {
  if (!hq) return null
  const head = String(hq).split(/[,;/]/)[0].trim()
  return CITY_AR[head] ?? (head === 'Iraq' ? null : head || null)
}

/* The research `founded` field holds a licence DATE for two banks and a year
   for a third. A profile shows a year. */
function foundedYear(v) {
  if (v == null) return null
  const m = String(v).match(/\d{4}/)
  return m ? Number(m[0]) : null
}

/**
 * Display names.
 *
 * Arabic for a LISTED bank comes from the curated roster, because that is the
 * name every other surface on the site already shows for that ticker and a
 * second spelling would read as a second institution. English comes from the
 * research, which is consistently transliterated where the roster is not
 * ("Rrgion Trade Bank For InvesTment").
 *
 * The research Arabic drops the «مصرف» that every Iraqi bank's name starts
 * with, so it is restored for banks the roster does not cover.
 */
function names(b, rosterBySym) {
  const sym = TICKERS[b.slug]
  const fromRoster = sym ? rosterBySym.get(sym) : null
  let ar = (fromRoster?.ar || '').trim() || b.name_ar.trim()
  if (!/^(مصرف|المصرف|بنك)/.test(ar)) ar = `مصرف ${ar}`
  let en = b.name_en.trim()
  if (!/bank/i.test(en)) en = `${en} Bank`
  return { ar, en }
}

function bankType(b) {
  if (SPECIALISED.has(b.slug)) return 'specialised'
  if (/Islamic/i.test(b.classification)) return 'islamic'
  if (/Investment/i.test(b.name_en) && !/Commercial/i.test(b.name_en)) return 'investment'
  return 'commercial'
}

function ownership(b) {
  if (b.classification === 'Government') return 'state'
  if (/^Foreign/.test(b.classification)) return 'foreign'
  if (/mixed/i.test(b.classification)) return 'mixed'
  return 'private'
}

/** The CBI directory's own annotation, never our inference. */
function operatingStatus(note) {
  const n = note ?? ''
  if (/liquidation/i.test(n)) return 'liquidation'
  if (/guardianship|judicial custody/i.test(n)) return 'guardianship'
  if (/under establishment|has not commenced/i.test(n)) return 'establishment'
  return 'operating'
}

const RESEARCH_STATE = {
  PARTIAL: 'researched', LIMITED: 'researched', REGULATORY_REVIEW: 'researched',
  SOURCE_UNAVAILABLE: 'source_unreachable', ROSTER_ONLY: 'not_researched',
}

/* Notes that only disambiguate a name or a domain are research hygiene, not
   something a reader needs. These are dropped from the public note; the status
   dimensions carry what matters. */
const HOUSEKEEPING = /^(No special annotation|CBI gives|CBI directory lists|CBI provides|CBI email|CBI contact|CBI now classifies|Directory contact|CBI [A-Za-z]+\/)/i

function publicNote(b) {
  const n = (b.regulatory_note ?? '').trim()
  if (!n || HOUSEKEEPING.test(n)) return null
  /* "USD restriction" is carried by its own column, so a note that says only
     that would be a duplicate. */
  const rest = n.replace(/USD restriction;?\s*/i, '').replace(/^;\s*/, '').trim()
  return rest || null
}

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)

function main() {
  const research = JSON.parse(fs.readFileSync(RESEARCH, 'utf8'))
  const canon = (slug) => SLUG_CANONICAL[slug] ?? slug
  const roster = JSON.parse(fs.readFileSync('public/data/companies.json', 'utf8'))
  const bankSyms = new Set(roster.filter((c) => c.sec === 'BANK').map((c) => c.sym))
  const rosterBySym = new Map(roster.map((c) => [c.sym, c]))
  const sources = new Map(research.sources.map((s) => [s.id, s]))

  const used = new Set(Object.values(TICKERS))
  const problems = []
  if (used.size !== Object.keys(TICKERS).length) problems.push('a ticker is mapped twice')
  for (const [slug, sym] of Object.entries(TICKERS)) {
    if (!bankSyms.has(sym)) problems.push(`${slug} → ${sym} is not a BANK in the curated roster`)
    if (!research.banks.some((b) => b.slug === slug)) problems.push(`${slug} is not in the research file`)
  }
  const unmapped = [...bankSyms].filter((s) => !used.has(s))
  if (unmapped.length) problems.push(`roster banks with no research entry: ${unmapped.join(', ')}`)

  const out = []
  const stats = { total: 0, listed: 0, status: {}, state: {}, services: 0, withheld: 0 }

  for (const b of research.banks) {
    const status = operatingStatus(b.regulatory_note)
    const state = RESEARCH_STATE[b.research_state] ?? 'not_researched'
    const unreachable = state === 'source_unreachable'
    const svc = []
    for (const [k, v] of Object.entries(b.services ?? {})) {
      if (v.state !== 'PUBLISHED_AVAILABLE') continue
      const key = SERVICE_KEY[k]
      if (!key) continue
      const s = v.source_id != null ? sources.get(v.source_id) : null
      svc.push({ key, url: s?.url ?? b.website, sid: v.source_id })
      stats.services++
    }
    stats.total++
    if (TICKERS[b.slug]) stats.listed++
    stats.status[status] = (stats.status[status] ?? 0) + 1
    stats.state[state] = (stats.state[state] ?? 0) + 1
    if (TICKER_WITHHELD[b.slug]) stats.withheld++

    const note = publicNote(b)
    const withheld = TICKER_WITHHELD[b.slug]
    const nm = names(b, rosterBySym)
    const founded = foundedYear(b.identity?.founded)
    out.push(`  {
    slug: ${q(canon(b.slug))},
    nameAr: ${q(nm.ar)},
    nameEn: ${q(nm.en)},
    bankType: ${q(bankType(b))},
    ownership: ${q(ownership(b))},
    ${founded ? `founded: ${founded},\n    ` : ''}hqCity: ${q(city(b.hq))},
    ${b.identity?.swift ? `swift: ${q(b.identity.swift)},\n    ` : ''}ticker: ${q(TICKERS[b.slug] ?? null)},
    operatingStatus: ${q(status)},
    usdRestricted: ${/USD restriction/i.test(b.regulatory_note ?? '') ? 'true' : 'null'},
    researchState: ${q(state)},
    researchNote: ${q(withheld ? (note ? `${note}. ${withheld}` : withheld) : note)},
    researchCheckedAt: ${q(b.observed_at)},
    cbiLicensed: true,
    licenceSourceKey: ${q(`research-${b.roster_source}`)},
    licenceVerifiedAt: ${q(b.observed_at)},
    ${unreachable ? 'website: null,' : `website: ${q(b.website)},`}
    services: [${svc.map((s) => `
      { key: ${q(s.key)}, availability: 'available', sourceKey: ${q(`research-${s.sid ?? b.roster_source}`)}, sourceUrl: ${q(s.url)}, verifiedAt: ${q(b.observed_at)} },`).join('')}
    ],
  },`)
  }

  console.log('reconcile research → roster')
  problems.forEach((p) => console.log('  ✗', p))
  if (!problems.length) console.log(`  ✓ ${Object.keys(TICKERS).length} tickers map to ${bankSyms.size} roster banks, one each`)
  console.log(`  · ${stats.total} entries · ${stats.listed} listed · ${stats.withheld} ticker withheld`)
  console.log(`  · operating status: ${JSON.stringify(stats.status)}`)
  console.log(`  · research state:   ${JSON.stringify(stats.state)}`)
  console.log(`  · ${stats.services} services carry a published source`)
  if (problems.length) process.exit(1)

  if (!process.argv.includes('--write')) return

  const header = `/* GENERATED by scripts/reconcile-research.mjs — do not edit by hand.
 *
 * Bank IDENTITY for all ${stats.total} CBI-directory entries in the research handoff,
 * observed ${research.observed_at}. Products are NOT here: which rate is publishable is
 * a judgement about evidence, and those live in banks-curated.ts with a reason
 * recorded next to each one.
 *
 * ${stats.listed} entries carry a ticker, hand-verified against the Arabic name of every
 * bank in the curated roster. ${stats.withheld} is withheld and says why.
 */
import type { RosterBank } from '../../lib/banking'

export const ROSTER_BANKS: readonly RosterBank[] = [
`
  fs.writeFileSync(OUT, header + out.join('\n') + '\n]\n')
  console.log(`  ✓ wrote ${OUT}`)
}

main()
