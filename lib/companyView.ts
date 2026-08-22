import { matchCompanyRecord } from '@/lib/market'

/**
 * The view model behind `/c/[sym]`.
 *
 * Everything here is shaping, not fetching. The page loads once and hands the
 * rows through these functions so every module on the page reads the same
 * numbers, and so the two rules that matter most stay in one place: a missing
 * comparison is `null`, never zero, and nothing is derived without saying so.
 */

/* ── Trailing returns ─────────────────────────────────────────────────────
   Latest close ÷ close at or just before the window start. Lifted unchanged
   from PerformanceOverview, which the transplanted page replaces — the
   arithmetic was right, it was only the markup that had to go. */

export type Pt = { t: number; v: number }
export type Returns = { asOf: number; ytd: number | null; y1: number | null; y3: number | null; y5: number | null }

const DAY = 86_400_000
/** ISX60 was rebased here; earlier values are off-scale and must not be compared. */
export const ISX60_REBASE = '2015-03-05'

export function buildReturns(series: Pt[]): Returns | null {
  if (series.length < 2) return null
  const last = series[series.length - 1]
  const at = (target: number): number | null => {
    let r: number | null = null
    for (const p of series) { if (p.t <= target) r = p.v; else break }
    return r
  }
  const ret = (base: number | null) => (base && base > 0 ? last.v / base - 1 : null)
  const y = new Date(last.t).getUTCFullYear()
  return {
    asOf: last.t,
    ytd: ret(at(Date.UTC(y, 0, 1))),
    y1: ret(at(last.t - 365 * DAY)),
    y3: ret(at(last.t - 3 * 365 * DAY)),
    y5: ret(at(last.t - 5 * 365 * DAY)),
  }
}

/* ── Ownership, resolved by name ──────────────────────────────────────────
   Neither monthly table carries a ticker. Both are keyed on the Arabic company
   name exactly as the scanned PDF printed it, so a company page can only find
   its rows by matching that name against the curated list — through
   `matchCompanyRecord`, the same function and threshold /statistics uses, so
   the two surfaces cannot disagree about which row belongs to whom. */

export type OwnershipRow = {
  year: number; month: number; name_ar: string
  capital: number | null; deposited_capital: number | null; deposit_ratio: number | null
  iraqi_shares: number | null; foreign_shares: number | null
  iraqi_count: number | null; foreign_count: number | null
}

export type ShareholderRow = {
  year: number; month: number; company_name_ar: string
  rank: number; name_ar: string; nationality: string | null
  curr_shares: number | null; curr_pct: number | null
  prev_pct: number | null; change_pct: number | null
}

type Meta = { sym: string; ar?: string | null }

/** The newest ownership row whose company name resolves to this ticker. */
export function ownershipFor(rows: OwnershipRow[], sym: string, meta: Meta[]): OwnershipRow | null {
  let best: OwnershipRow | null = null
  for (const r of rows) {
    if (matchCompanyRecord(r.name_ar, meta)?.sym !== sym) continue
    if (!best || r.year * 12 + r.month > best.year * 12 + best.month) best = r
  }
  return best
}

export type Holder = {
  rank: number; name: string; foreign: boolean
  pct: number
  /** Percentage-point change, or null when the filing gives no usable prior. */
  changePct: number | null
}

/**
 * Major holders for one ticker, from the newest month that has any.
 *
 * Two findings from the table itself, not from caution.
 *
 * `name_ar` is empty on a number of rows. A holder with no name is not a
 * holder anyone can read, so those are dropped rather than rendered blank.
 *
 * And `change_pct` is not usable in either direction. Of 1,000 rows sampled,
 * 927 hold exactly 0, 11 hold null, and every one of the 62 non-zero values
 * sits on a `prev_pct` that is a SHARE COUNT rather than a percentage —
 * 4,850,015,705 in one, 2,661,564,561 in another. So the non-zero changes are
 * computed from a corrupt prior and the rest are a default, which means there
 * is no row anywhere whose change can be trusted. It is reported as absent
 * throughout rather than printed as a zero that would read as "no change".
 */
export function holdersFor(rows: ShareholderRow[], sym: string, meta: Meta[]): Holder[] {
  const mine = rows.filter(r => matchCompanyRecord(r.company_name_ar, meta)?.sym === sym)
  if (!mine.length) return []
  const newest = Math.max(...mine.map(r => r.year * 12 + r.month))
  return mine
    .filter(r => r.year * 12 + r.month === newest)
    .filter(r => r.name_ar?.trim() && r.curr_pct != null && r.curr_pct > 0)
    .sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0))
    .map((r, i) => ({
      rank: i + 1,
      name: r.name_ar.trim(),
      foreign: (r.nationality ?? '').toLowerCase().startsWith('for'),
      pct: r.curr_pct as number,
      changePct: null,
    }))
}

/* ── Ratios ───────────────────────────────────────────────────────────────
   `financial_ratios_public` is long-form: one row per ratio_key per period.
   The page reads the newest ANNUAL for balance-sheet ratios, which is the
   basis the filings themselves use. */

export type RatioRow = { fiscal_year: number; period: string; ratio_key: string; value: number | null }

export function latestRatios(rows: RatioRow[]): { year: number | null; map: Record<string, number> } {
  const annual = rows.filter(r => r.period === 'ANNUAL' && r.value != null)
  if (!annual.length) return { year: null, map: {} }
  const year = Math.max(...annual.map(r => r.fiscal_year))
  const map: Record<string, number> = {}
  for (const r of annual) if (r.fiscal_year === year) map[r.ratio_key] = r.value as number
  return { year, map }
}

/* ── Facts, and why nothing is derived from them ──────────────────────────
   The first draft of this file derived Q4 as the annual less the first three
   quarters, which is what the earlier module did and what the reference's mock
   data supports. The real table does not support it.

   Across every company-year in `financial_facts_public`, exactly THREE have
   all four quarters filed. In none of them do the quarters reconcile with the
   annual: IBSD 2025 stores a Q4 equal to its annual figure to the dinar — a
   full-year number sitting in a quarter slot — BMNS 2025's four quarters sum
   6% under its annual, and BIIB 2025's sum 157% over. No rule holds across
   the set, so a derived quarter would be a number that reconciles with
   nothing while looking exactly like a filed one.

   So: only filed periods are returned, and a Q4 equal to its own annual is
   dropped as the mislabelled full-year figure it is. Deriving standalone
   quarters needs the filings themselves read, not this table. */

export type FactRow = { fiscal_year: number; period: string; line_key: string; value_iqd: number | null }

export type EarnPeriod = { year: number; period: string; label: string; rev: number | null; ni: number | null }

const QS = ['Q1', 'Q2', 'Q3', 'Q4']
const near = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) < 0.02

export function earningsSeries(facts: FactRow[], mode: 'annual' | 'quarterly'): EarnPeriod[] {
  const val = (y: number, p: string, k: string) =>
    facts.find(f => f.fiscal_year === y && f.period === p && f.line_key === k)?.value_iqd ?? null

  // Banks file no single revenue line; their top line is net financing income
  // plus net commissions.
  const rev = (y: number, p: string) => {
    const r = val(y, p, 'revenue')
    if (r != null) return r
    const fi = val(y, p, 'financing_income'), rc = val(y, p, 'revenue_and_commissions')
    return fi == null && rc == null ? null : (fi ?? 0) + (rc ?? 0)
  }

  if (mode === 'annual') {
    const yrs = Array.from(new Set(facts.filter(f => f.period === 'ANNUAL').map(f => f.fiscal_year))).sort((a, b) => a - b)
    return yrs
      .map(y => ({ year: y, period: 'ANNUAL', label: String(y), rev: rev(y, 'ANNUAL'), ni: val(y, 'ANNUAL', 'net_income') }))
      .filter(r => r.rev != null || r.ni != null)
      .slice(-6)
  }

  const out: EarnPeriod[] = []
  for (const y of Array.from(new Set(facts.map(f => f.fiscal_year)))) {
    for (const p of QS) {
      const r = rev(y, p), n = val(y, p, 'net_income')
      if (r == null && n == null) continue
      // A Q4 equal to its own annual is the full year filed into a quarter
      // slot. Plotting it would put a 4x bar beside three real ones.
      const annualNi = val(y, 'ANNUAL', 'net_income')
      if (p === 'Q4' && n != null && annualNi != null && near(n, annualNi)) continue
      out.push({ year: y, period: p, label: `${p} ${y}`, rev: r, ni: n })
    }
  }
  return out.sort((a, b) => rank(a.year, a.period) - rank(b.year, b.period)).slice(-6)
}

const rank = (y: number, p: string) => y * 10 + (p === 'ANNUAL' ? 5 : QS.indexOf(p) + 1)

/**
 * The latest FILED annual figure, and the year it belongs to.
 *
 * Not a trailing twelve months. A TTM needs four standalone quarters that sum
 * to something real, and the note above establishes that this table has no
 * company-year where they do. Printing "TTM" over a sum of four unreconciled
 * quarters would be the most confident-looking wrong number on the page, so
 * the figure is the last audited year and the label says which year.
 */
export function latestAnnual(series: EarnPeriod[], key: 'rev' | 'ni'): { value: number | null; year: number | null } {
  const annuals = series.filter(s => s.period === 'ANNUAL' && s[key] != null)
  if (!annuals.length) return { value: null, year: null }
  const last = annuals[annuals.length - 1]
  return { value: last[key], year: last.year }
}
