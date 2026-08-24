import { companyMarketCap } from '@/lib/market'


/**
 * الإحصائيات — the statistics hub's data model.
 *
 * `docs/STATISTICS_DATA_MAP.md` is the audit; this file is that audit in code,
 * including the two things the audit refused to ship and the owner's decision
 * confirming them (`IRAQSM_PHASE4_STATISTICS_AUDIT_DECISION.md`):
 *
 *   · `sector_monthly.market_cap`  — NEVER read. Three sources disagree by 17%
 *                                    for the same month and none reconciles.
 *   · `company_caps_monthly`       — NEVER read. Five months, two corrupt.
 *
 * Neither table is imported here, so neither can leak into a figure by
 * accident. Market cap comes from the product's canonical company-level
 * definition instead — `last close × issued shares` — the same figure /market,
 * /screener and the homepage already print.
 *
 * ── The period rule ───────────────────────────────────────────────────────
 * Four genuinely different cadences live on this page and are never merged
 * into one timestamp: a long daily series, a monthly sector table two sessions
 * behind it, a current-session snapshot, and a foreign-flow window with its
 * own latest date. Every accessor below returns the window it actually covers
 * so the module can print it.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1 · The daily series
   ═══════════════════════════════════════════════════════════════════════════ */

/** The ISX60 rebase. Before it, `total_value` and `listed_companies` are null
 *  for hundreds of sessions and the index sits on a different base — so this is
 *  the floor for every period the page offers, not a stylistic choice. */
export const REBASE = '2015-03-05'

export type Session = {
  date: string
  isx60: number | null
  /** IQD. Zero nulls since the rebase. */
  value: number | null
  /** Shares. Zero nulls since the rebase. */
  volume: number | null
  /** ⚠ 59 genuine holes since the rebase — gaps, never zeros. */
  trades: number | null
  traded: number | null
  listed: number | null
}

export const PERIODS = [
  { id: '1M', ar: 'شهر', en: '1M', sessions: 22 },
  { id: '3M', ar: '3 أشهر', en: '3M', sessions: 66 },
  { id: '6M', ar: '6 أشهر', en: '6M', sessions: 132 },
  { id: '1Y', ar: 'سنة', en: '1Y', sessions: 250 },
  { id: '3Y', ar: '3 سنوات', en: '3Y', sessions: 750 },
  { id: '5Y', ar: '5 سنوات', en: '5Y', sessions: 1250 },
  { id: 'ALL', ar: 'الكل', en: 'All', sessions: Number.POSITIVE_INFINITY },
] as const
export type PeriodId = (typeof PERIODS)[number]['id']

export const METRICS = [
  { id: 'value', ar: 'قيمة التداول', en: 'Traded value', unitAr: 'د.ع', unitEn: 'IQD' },
  { id: 'volume', ar: 'الحجم', en: 'Volume', unitAr: 'سهم', unitEn: 'shares' },
  { id: 'trades', ar: 'الصفقات', en: 'Trades', unitAr: 'صفقة', unitEn: 'trades' },
] as const
export type MetricId = (typeof METRICS)[number]['id']

export const metricOf = (s: { value: number | null; volume: number | null; trades: number | null }, id: MetricId) =>
  id === 'value' ? s.value : id === 'volume' ? s.volume : s.trades

export function windowFor(all: Session[], period: PeriodId): Session[] {
  const n = PERIODS.find((p) => p.id === period)!.sessions
  return Number.isFinite(n) ? all.slice(-n) : all
}

/* ── Buckets ───────────────────────────────────────────────────────────────
   «الكل» is ~2,600 sessions. Drawing 2,600 columns in a 900px frame is three
   sessions per pixel, none legible — so long windows are SUMMED and the bucket
   unit is printed, because a monthly total and a session total are different
   quantities and nothing about the chart's shape says which is on screen.

   A bucket keeps `missing` — how many of its sessions had no observation for
   the metric — so a summed bar can admit it is partial instead of quietly
   reading low. */
export type Grain = 'session' | 'week' | 'month'
export type Bucket = {
  key: string
  from: string
  to: string
  value: number | null
  volume: number | null
  trades: number | null
  /** Sessions in the bucket. */
  n: number
  /** Sessions whose observation for THIS metric was null. */
  missing: number
}

export function grainFor(period: PeriodId): Grain {
  if (period === '1M' || period === '3M') return 'session'
  if (period === '6M' || period === '1Y') return 'week'
  return 'month'
}

export const GRAIN_LABEL: Record<Grain, { ar: string; en: string }> = {
  session: { ar: 'لكل جلسة', en: 'per session' },
  week: { ar: 'مجموع أسبوعي', en: 'weekly total' },
  month: { ar: 'مجموع شهري', en: 'monthly total' },
}

/**
 * Sum sessions into buckets for one metric.
 *
 * A bucket with no observation at all stays `null` rather than becoming 0 —
 * that is the difference between «the market did not trade» and «we do not
 * know», and it is why the chart draws a gap.
 */
export function bucketize(rows: Session[], grain: Grain, metric: MetricId): Bucket[] {
  const keyOf = (iso: string) => {
    if (grain === 'session') return iso
    if (grain === 'month') return iso.slice(0, 7)
    const d = new Date(`${iso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    return d.toISOString().slice(0, 10)
  }
  const out: Bucket[] = []
  for (const r of rows) {
    const k = keyOf(r.date)
    const v = metricOf(r, metric)
    const last = out[out.length - 1]
    if (last && last.key === k) {
      last.to = r.date
      last.n++
      if (v == null) last.missing++
      else last[metric] = (last[metric] ?? 0) + v
    } else {
      out.push({
        key: k, from: r.date, to: r.date,
        value: null, volume: null, trades: null,
        n: 1, missing: v == null ? 1 : 0,
        ...(v == null ? {} : { [metric]: v }),
      } as Bucket)
    }
  }
  return out
}

/* ── Window totals ────────────────────────────────────────────────────────
   Mean per TRADING SESSION, not per calendar day: the exchange trades five
   days in seven, and dividing by calendar days understates every average by
   about 29%. The divisor counts only sessions that actually carried an
   observation, and `coverage` reports that count so a total over a metric with
   holes cannot pretend to be complete. */
export type Totals = {
  sessions: number
  from: string
  to: string
  sum: number
  mean: number
  median: number | null
  /** Sessions with an observation for this metric. */
  coverage: number
  meanTraded: number | null
  listed: number | null
}

export function totalsFor(rows: Session[], metric: MetricId): Totals | null {
  if (!rows.length) return null
  const vals = rows.map((r) => metricOf(r, metric)).filter((v): v is number => v != null)
  const sum = vals.reduce((a, b) => a + b, 0)
  const traded = rows.map((r) => r.traded).filter((v): v is number => v != null)
  return {
    sessions: rows.length,
    from: rows[0].date,
    to: rows[rows.length - 1].date,
    sum,
    mean: vals.length ? sum / vals.length : 0,
    median: median(vals),
    coverage: vals.length,
    meanTraded: traded.length ? traded.reduce((a, b) => a + b, 0) / traded.length : null,
    listed: rows[rows.length - 1].listed,
  }
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b)
  if (!v.length) return null
  const mid = v.length >> 1
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · Sector activity — `sector_monthly`, activity fields only
   ═══════════════════════════════════════════════════════════════════════════ */

export type SectorMonthRow = {
  year: number
  month: number
  sector: string
  volume: number | null
  value: number | null
  trades: number | null
  traded_companies: number | null
  /** Null for every recent row. Stays `—`, never fabricated. */
  listed_companies: number | null
  /* `market_cap` is deliberately absent from this type. The column exists and
     is unusable — see the file header. Typing it out is how it stays unread. */
}

/**
 * The canonical sector identity map — EXPLICIT, per the owner's decision.
 *
 * No fuzzy matching and no silent heuristics: every name the column actually
 * contains is listed, and anything unlisted is surfaced as unmapped rather
 * than guessed at.
 *
 * Two different defects are being corrected here.
 *
 * a · HISTORICAL RENAMES. Sequential, non-overlapping, and merged so the
 *     history stays continuous. `Hotels` runs to 2020-04 and `Tourism&Hotels`
 *     begins 2020-03; `Telecom` to 2020-04 and `Telecommunication` from
 *     2020-07. Dropping the old name would delete five years of real activity.
 *
 * b · CONCURRENT ZERO-ACTIVITY DUPLICATES. `Banking` appears in the same month
 *     as `Banks` with 0 traded value and 0 traded companies in all 56 of its
 *     rows, carrying only market-cap residue. Same shape for `Agricultur`
 *     (13/13 zero) and `Hotel` (6/6 zero). For an ACTIVITY module these are
 *     invalid duplicates and are excluded — they contribute nothing to an
 *     activity sum by construction, so excluding them cannot lose activity.
 */
export type SectorKey =
  | 'banks' | 'telecom' | 'industry' | 'tourism' | 'insurance'
  | 'agriculture' | 'investment' | 'services' | 'transfer' | 'unknown'

/** `alias → canonical`, plus whether the alias is a rename or a dead duplicate. */
export const SECTOR_ALIASES: Record<string, { key: SectorKey; kind: 'primary' | 'rename' | 'duplicate' }> = {
  // a · primaries and their historical renames
  Banks: { key: 'banks', kind: 'primary' },
  Telecommunication: { key: 'telecom', kind: 'primary' },
  Telecom: { key: 'telecom', kind: 'rename' },
  Industry: { key: 'industry', kind: 'primary' },
  'Tourism&Hotels': { key: 'tourism', kind: 'primary' },
  Hotels: { key: 'tourism', kind: 'rename' },
  Insurance: { key: 'insurance', kind: 'primary' },
  Agriculture: { key: 'agriculture', kind: 'primary' },
  Investment: { key: 'investment', kind: 'primary' },
  'Financial services': { key: 'investment', kind: 'rename' },
  Service: { key: 'services', kind: 'primary' },
  Services: { key: 'services', kind: 'rename' },
  'Money Transfer': { key: 'transfer', kind: 'primary' },
  // b · concurrent zero-activity duplicates — excluded from activity
  Banking: { key: 'banks', kind: 'duplicate' },
  Agricultur: { key: 'agriculture', kind: 'duplicate' },
  Hotel: { key: 'tourism', kind: 'duplicate' },
  Unknown: { key: 'unknown', kind: 'duplicate' },
}

export const SECTOR_LABELS: Record<SectorKey, { ar: string; en: string }> = {
  banks: { ar: 'المصارف', en: 'Banks' },
  telecom: { ar: 'الاتصالات', en: 'Telecom' },
  industry: { ar: 'الصناعة', en: 'Industry' },
  tourism: { ar: 'الفنادق والسياحة', en: 'Hotels & tourism' },
  insurance: { ar: 'التأمين', en: 'Insurance' },
  agriculture: { ar: 'الزراعة', en: 'Agriculture' },
  investment: { ar: 'الاستثمار المالي', en: 'Investment' },
  services: { ar: 'الخدمات', en: 'Services' },
  transfer: { ar: 'التحويل المالي', en: 'Money transfer' },
  unknown: { ar: 'غير مصنّف', en: 'Unclassified' },
}

export type SectorActivity = {
  key: SectorKey
  label: string
  value: number
  volume: number
  trades: number
  tradedCompanies: number
  /** Always null in the current data. Kept so the UI prints `—` for it. */
  listedCompanies: number | null
  /** Raw source rows folded into this sector, for the reconciliation report. */
  sources: string[]
}

/** What `normalizeSectors` reconciled, so the caller can prove it and the UI
 *  can degrade honestly if it did not add up. */
export type SectorReconciliation = {
  month: string
  rawRows: number
  usedRows: number
  droppedDuplicates: number
  unmapped: string[]
  sectors: number
  /** Sums over the rows actually used. */
  totals: { value: number; volume: number; trades: number }
  /** Sums over every raw row that carried activity, duplicates included. */
  rawActivityTotals: { value: number; volume: number; trades: number }
  /** True when normalization lost no activity. */
  reconciles: boolean
}

/**
 * Fold one month's raw rows onto canonical sectors.
 *
 * The reconciliation is the point: `rawActivityTotals` sums EVERY raw row and
 * `totals` sums only the ones kept, so if a drop ever removed real activity the
 * two disagree and `reconciles` goes false. The UI shows the partial-data
 * treatment in that case rather than a total it cannot stand behind.
 */
export function normalizeSectors(rows: SectorMonthRow[]): {
  sectors: SectorActivity[]
  recon: SectorReconciliation
} {
  const month = rows.length ? `${rows[0].year}-${String(rows[0].month).padStart(2, '0')}` : ''
  const unmapped: string[] = []
  let dropped = 0
  const acc = new Map<SectorKey, SectorActivity>()

  const rawActivity = { value: 0, volume: 0, trades: 0 }
  for (const r of rows) {
    rawActivity.value += r.value ?? 0
    rawActivity.volume += r.volume ?? 0
    rawActivity.trades += r.trades ?? 0
  }

  for (const r of rows) {
    const alias = SECTOR_ALIASES[r.sector]
    if (!alias) { unmapped.push(r.sector); continue }

    /* A duplicate alias is dropped ONLY when it is genuinely inert. If one ever
       arrives carrying activity, the map's assumption has broken and it is
       folded in instead — so the reconciliation stays true and the defect
       surfaces as a changed sector count rather than as a silent loss. */
    const inert = (r.value ?? 0) === 0 && (r.volume ?? 0) === 0 &&
      (r.trades ?? 0) === 0 && (r.traded_companies ?? 0) === 0
    if (alias.kind === 'duplicate' && inert) { dropped++; continue }

    const cur = acc.get(alias.key) ?? {
      key: alias.key, label: '', value: 0, volume: 0, trades: 0,
      tradedCompanies: 0, listedCompanies: null, sources: [],
    }
    cur.value += r.value ?? 0
    cur.volume += r.volume ?? 0
    cur.trades += r.trades ?? 0
    cur.tradedCompanies += r.traded_companies ?? 0
    // Null stays null; a real number would have to come from the source.
    if (r.listed_companies != null) cur.listedCompanies = (cur.listedCompanies ?? 0) + r.listed_companies
    if (!cur.sources.includes(r.sector)) cur.sources.push(r.sector)
    acc.set(alias.key, cur)
  }

  const sectors = Array.from(acc.values()).sort((a, b) => b.value - a.value)
  const totals = sectors.reduce((t, s) => ({
    value: t.value + s.value, volume: t.volume + s.volume, trades: t.trades + s.trades,
  }), { value: 0, volume: 0, trades: 0 })

  const eq = (a: number, b: number) => Math.abs(a - b) < 1
  return {
    sectors,
    recon: {
      month,
      rawRows: rows.length,
      usedRows: rows.length - dropped - unmapped.length,
      droppedDuplicates: dropped,
      unmapped,
      sectors: sectors.length,
      totals,
      rawActivityTotals: rawActivity,
      reconciles: eq(totals.value, rawActivity.value) &&
        eq(totals.volume, rawActivity.volume) && eq(totals.trades, rawActivity.trades),
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · Market-cap snapshot — the LISTED universe
   ═══════════════════════════════════════════════════════════════════════════

   ── The universe question, and how it was settled ─────────────────────────
   There is NO listing-status field anywhere in this product: not in
   `company_metrics`, not in `companies.json`. So "currently listed" cannot be
   read off a column, and §2 of the decision forbids inferring it from recent
   trading alone.

   It does not have to be. `public/data/companies.json` is a CURATED roster of
   104 companies, and it is an independent signal from trading recency:

     · the official `daily_index.listed_companies` for the latest sessions is
       **103** — the roster reconciles to it within one company (0.96%);
     · the 20 tickers `company_metrics` carries and the roster does NOT all
       last traded between 2010 and 2019 — every one is 7.5+ years dead, so
       the curation is meaningful rather than arbitrary;
     · every one of the 104 has a real published close.

   That is a reliable listed universe at the aggregate level, so this is
   Option A of the decision: compute over the listed roster, include
   suspended-but-listed names at their last real published close, and disclose
   the stale-price coverage rather than quietly dropping them.

   ⚠ THE LIMITATION, STATED: the roster reconciles to 103 in COUNT, but with no
   status field it is impossible to say WHICH company accounts for the delta of
   one, or to prove any individual name's status. The universe is trustworthy
   as a total and is not a per-company listing assertion.

   ── Why not the previous 80/82 figure ─────────────────────────────────────
   An earlier draft computed over "active" companies only — those that traded
   inside 60 days — and reached 25.58T. That silently answered a different
   question from the one the label asks: a listed company has a market
   capitalisation whether or not it traded this month. The listed universe
   gives 28.20T, of which 90.35% rests on a close from the last 60 days.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CapRow = {
  sym: string
  name: string
  sector: string
  close: number
  shares: number
  /** `close × shares`, IQD. */
  marketCap: number
  /** Sessions since this company last actually traded. */
  daysSinceTrade: number
  /** The close is older than 60 days — a real published price, not a current one. */
  stalePrice: boolean
  /** The date that close was published. */
  closeDate: string | null
}

export type CapSnapshot = {
  /** The exact resolved trading session, read from the data, never hard-coded. */
  session: string | null
  rows: CapRow[]
  total: number
  /** Companies on the curated listed roster. */
  universe: number
  /** The official count from `daily_index.listed_companies`, for reconciliation. */
  officialListed: number | null
  included: number
  /** Dropped because a required input was unavailable — never treated as zero. */
  excluded: number
  excludedSyms: string[]
  /** Included, but priced off a close older than 60 days. */
  stalePriced: number
  /** Their share of the total, 0–1. Disclosed, never hidden. */
  staleShare: number
  bySector: { key: string; label: string; total: number; count: number }[]
  /** Sector sums add back to the company total, to the dinar. */
  reconciles: boolean
}

/** Reject a name that is only digits or punctuation — the `usableName` rule
 *  Phase 3 introduced for the corrupt upstream `name_ar` values. */
export function usableName(v: string | null | undefined): v is string {
  if (!v) return false
  const t = v.trim()
  return t.length > 1 && !/^[\d\s.,\-_/\\]+$/.test(t)
}

export type CapInput = {
  sym: string
  sector: string
  close: number
  daysSinceTrade: number
  closeDate: string | null
  nameAr?: string | null
  nameEn?: string | null
}

/** A close older than this is a real published price, but not a current one. */
export const STALE_PRICE_DAYS = 60

/**
 * Aggregate the listed roster into the sector snapshot.
 *
 * Neither `sector_monthly.market_cap` nor `company_caps_monthly` is consulted —
 * neither is even imported by this module. A company missing a close or a share
 * count is EXCLUDED and counted, never zeroed, and `reconciles` proves the
 * sector sums equal the company total before anything renders.
 */
export function capSnapshot(
  roster: CapInput[],
  shares: Map<string, number>,
  names: Map<string, { ar?: string; en?: string }>,
  session: string | null,
  officialListed: number | null,
  ar: boolean,
  sectorLabelOf: (key: string, ar: boolean) => string,
): CapSnapshot {
  const rows: CapRow[] = []
  const excludedSyms: string[] = []

  for (const c of roster) {
    const sh = shares.get(c.sym) ?? 0
    /* One definition, shared with the screener, the heat map and the homepage
       board — see `companyMarketCap` in lib/market.ts. */
    const cap = companyMarketCap(c.close, sh)
    if (cap == null) { excludedSyms.push(c.sym); continue }
    const meta = names.get(c.sym)
    const name = [
      ar ? meta?.ar : meta?.en, ar ? c.nameAr : c.nameEn,
      ar ? meta?.en : meta?.ar, ar ? c.nameEn : c.nameAr,
    ].find(usableName) ?? c.sym
    rows.push({
      sym: c.sym, name, sector: c.sector, close: c.close, shares: sh,
      marketCap: cap,
      daysSinceTrade: c.daysSinceTrade,
      stalePrice: c.daysSinceTrade > STALE_PRICE_DAYS,
      closeDate: c.closeDate,
    })
  }

  rows.sort((a, b) => b.marketCap - a.marketCap)
  const total = rows.reduce((a, r) => a + r.marketCap, 0)
  const staleTotal = rows.filter((r) => r.stalePrice).reduce((a, r) => a + r.marketCap, 0)

  const acc = new Map<string, { total: number; count: number }>()
  for (const r of rows) {
    const cur = acc.get(r.sector) ?? { total: 0, count: 0 }
    cur.total += r.marketCap; cur.count++
    acc.set(r.sector, cur)
  }
  const bySector = Array.from(acc.entries())
    .map(([key, v]) => ({ key, label: sectorLabelOf(key, ar), total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)

  const sectorSum = bySector.reduce((a, s) => a + s.total, 0)
  return {
    session,
    rows,
    total,
    universe: roster.length,
    officialListed,
    included: rows.length,
    excluded: excludedSyms.length,
    excludedSyms,
    stalePriced: rows.filter((r) => r.stalePrice).length,
    staleShare: total ? staleTotal / total : 0,
    bySector,
    // Floating-point aggregation over ~28 trillions; a 1 IQD tolerance.
    reconciles: Math.abs(sectorSum - total) < 1,
  }
}

/** Share of total market cap held by the top `n` companies. */
export function capShare(snap: CapSnapshot, n: number): number | null {
  if (!snap.total) return null
  return snap.rows.slice(0, n).reduce((a, r) => a + r.marketCap, 0) / snap.total
}


/* ═══════════════════════════════════════════════════════════════════════════
   4 · Formatting
   ═══════════════════════════════════════════════════════════════════════════ */

export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

/** Compact IQD with Latin magnitudes — an Arabic magnitude word lands on the
 *  wrong side of a signed number under bidi. */
export function iqd(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return Math.round(v).toString()
}

const AR_MONTHS = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول']

/** «18 آب 2026». Arabic text carrying numerals — never `bdi`-isolated. */
export function arFull(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${AR_MONTHS[m - 1]} ${y}`
}

/** «آب 2026» — for a month-cadence module. */
export function arMonth(ym: string | null): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  return `${AR_MONTHS[m - 1]} ${y}`
}

/** «08/2026» — compact, for a chart axis. */
export function shortAxis(key: string, grain: Grain): string {
  if (grain === 'month') { const [y, m] = key.split('-'); return `${m}/${y.slice(2)}` }
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}

/** Full IQD, grouped, with a real minus sign. For a readout where the compact
 *  form would hide the digits that matter. */
export const iqdFull = (v: number) =>
  (v < 0 ? '−' : '') + nf0.format(Math.abs(Math.round(v)))

/* The reference writes these four with Arabic-Indic digits («كانون٢»). This
   repo's lint forbids them so every figure on a page uses one numeral system;
   Latin digits here, same as everywhere else. */
const AR_MONTHS_SHORT = ['كانون2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين1', 'تشرين2', 'كانون1']

/** «18 آب». Day and short month, no year — for a label already inside a year. */
export function arShort(iso: string | null): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${AR_MONTHS_SHORT[m - 1]}`
}

/** «18 آب 2026». Day, short month and YEAR — used wherever two windows are
 *  compared, because «١٠ آب — ٢٦ آب» for a three-year window reads as sixteen
 *  days, which is the one thing a period label must never do. */
export function arShortY(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${AR_MONTHS_SHORT[m - 1]} ${y}`
}

/** «آب 2026», short form — for a monthly chart bucket. */
export function arMonthShort(ym: string | null): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  return `${AR_MONTHS_SHORT[m - 1]} ${y}`
}

/**
 * The full label for one bucket, for the chart readout.
 *
 * A week rides its year on the CLOSING date: a week that straddles the turn of
 * the year otherwise reads «28 كانون١ — 1 كانون٢» with no year at either end.
 */
export function bucketLabel(b: Bucket, grain: Grain, ar: boolean): string {
  if (grain === 'session') return ar ? arFull(b.from) : b.from
  if (grain === 'month') return ar ? arMonth(b.key) : b.key
  return ar
    ? `أسبوع ${arShort(b.from)} — ${arShort(b.to)} ${b.to.slice(0, 4)}`
    : `Week ${b.from} — ${b.to}`
}
