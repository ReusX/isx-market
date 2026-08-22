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

/* ── Facts, and the one derived period ────────────────────────────────────
   Q1–Q3 are stored standalone. Q4 is not filed at all — it is the annual less
   the first three quarters, so it is DERIVED and every surface that prints it
   has to say so. `quarterFacts` returns the flag rather than hiding it. */

export type FactRow = { fiscal_year: number; period: string; line_key: string; value_iqd: number | null }

export type EarnPeriod = { year: number; period: string; label: string; rev: number | null; ni: number | null; derived: boolean }

const QS = ['Q1', 'Q2', 'Q3', 'Q4']

export function earningsSeries(facts: FactRow[], mode: 'annual' | 'quarterly'): EarnPeriod[] {
  const val = (y: number, p: string, k: string) =>
    facts.find(f => f.fiscal_year === y && f.period === p && f.line_key === k)?.value_iqd ?? null

  const standalone = (y: number, p: string, k: string): { v: number | null; derived: boolean } => {
    if (p !== 'Q4') return { v: val(y, p, k), derived: false }
    const a = val(y, 'ANNUAL', k), q1 = val(y, 'Q1', k), q2 = val(y, 'Q2', k), q3 = val(y, 'Q3', k)
    return [a, q1, q2, q3].every(v => v != null)
      ? { v: (a as number) - (q1 as number) - (q2 as number) - (q3 as number), derived: true }
      : { v: null, derived: false }
  }

  // Banks file no single revenue line; their top line is net financing income
  // plus net commissions. Same composite the earlier module used.
  const rev = (y: number, p: string) => {
    const r = standalone(y, p, 'revenue')
    if (r.v != null) return r
    const fi = standalone(y, p, 'financing_income'), rc = standalone(y, p, 'revenue_and_commissions')
    if (fi.v == null && rc.v == null) return { v: null, derived: false }
    return { v: (fi.v ?? 0) + (rc.v ?? 0), derived: fi.derived || rc.derived }
  }

  if (mode === 'annual') {
    const yrs = Array.from(new Set(facts.filter(f => f.period === 'ANNUAL').map(f => f.fiscal_year))).sort((a, b) => a - b)
    return yrs
      .map(y => {
        const r = rev(y, 'ANNUAL')
        return { year: y, period: 'ANNUAL', label: String(y), rev: r.v, ni: val(y, 'ANNUAL', 'net_income'), derived: false }
      })
      .filter(r => r.rev != null || r.ni != null)
      .slice(-6)
  }

  const out: EarnPeriod[] = []
  for (const y of Array.from(new Set(facts.map(f => f.fiscal_year)))) {
    for (const p of QS) {
      const r = rev(y, p), n = standalone(y, p, 'net_income')
      if (r.v == null && n.v == null) continue
      out.push({ year: y, period: p, label: `${p} ${y}`, rev: r.v, ni: n.v, derived: r.derived || n.derived })
    }
  }
  return out.sort((a, b) => rank(a.year, a.period) - rank(b.year, b.period)).slice(-6)
}

const rank = (y: number, p: string) => y * 10 + (p === 'ANNUAL' ? 5 : QS.indexOf(p) + 1)

/** Trailing twelve months from the last four standalone quarters, or null. */
export function ttmOf(series: EarnPeriod[], key: 'rev' | 'ni'): { value: number | null; derived: boolean } {
  const last4 = series.filter(s => s.period !== 'ANNUAL').slice(-4)
  if (last4.length < 4) return { value: null, derived: false }
  let sum = 0
  for (const s of last4) {
    const v = s[key]
    if (v == null) return { value: null, derived: false }
    sum += v
  }
  return { value: sum, derived: last4.some(s => s.derived) }
}
