/**
 * The bank health score · a CAMELS-lite reading of each listed bank's filed
 * statements, 0–100, in five areas:
 *
 *   capital     25%  equity ÷ assets; capital adequacy where filed (CBI floor 12.5%)
 *   profit      25%  return on assets, return on equity, loss years in the last three
 *   liquidity   20%  (cash + CBI balances + due from banks) ÷ customer deposits; LCR/NSFR where filed
 *   efficiency  15%  costs ÷ operating income, operating income = pre-tax profit + costs
 *   activity    15%  financing ÷ assets (is it lending at all), deposit growth over a year
 *
 * Each metric is scored on fixed thresholds AND on its rank among the listed
 * banks, half and half — so a bad year for the whole sector does not make the
 * least-bad bank «excellent», and a metric only a few banks file (fewer than
 * eight) is scored on thresholds alone. An area is the mean of the metrics it
 * has; the total re-weights over the areas present and needs at least three.
 *
 * Which figures:
 *  · balance-sheet items come from the newest filing that has them (an annual
 *    summary often omits deposits that the next quarterly carries);
 *  · profit and costs from the newest ANNUAL (or Q4), else the newest interim
 *    annualised — interim statements are cumulative year-to-date;
 *  · nothing older than 18 months before the bank's newest filing is mixed in,
 *    and a bank whose newest filing is itself older than 18 months is «stale».
 * Impossible ratios (equity above assets, |ROA| over 20%, …) are dropped, not
 * scored: a mis-read unit must not become a grade.
 *
 * This is an indicator built from published statements, not a credit rating.
 * Pure: no I/O. The loader is loadBankScores in lib/banksServer.ts.
 */

export type FinRow = { ticker: string; fiscal_year: number; period: string; line_key: string; value_iqd: number }

export const SCORE_KEYS = [
  'total_assets', 'total_equity', 'net_income', 'pretax_income', 'ga_expenses', 'customer_deposits',
  'cash_and_cbi', 'due_from_banks', 'islamic_financing', 'capital_adequacy_ratio', 'lcr', 'nsfr',
] as const

export type Pillar = 'capital' | 'profit' | 'liquidity' | 'efficiency' | 'activity'
export const PILLARS: Pillar[] = ['capital', 'profit', 'liquidity', 'efficiency', 'activity']
const WEIGHT: Record<Pillar, number> = { capital: 0.25, profit: 0.25, liquidity: 0.2, efficiency: 0.15, activity: 0.15 }

export type Metric = 'eq' | 'car' | 'roa' | 'roe' | 'losses' | 'liq' | 'lcr' | 'ci' | 'fin' | 'dg'
const PILLAR_OF: Record<Metric, Pillar> = {
  eq: 'capital', car: 'capital', roa: 'profit', roe: 'profit', losses: 'profit',
  liq: 'liquidity', lcr: 'liquidity', ci: 'efficiency', fin: 'activity', dg: 'activity',
}
/* Metrics where a lower value is better (rank is inverted). */
const LOWER_BETTER = new Set<Metric>(['ci', 'losses'])

/** Piecewise-linear thresholds, (value, score) ascending in value. */
const T: Record<Metric, [number, number][]> = {
  eq:     [[0, 0], [0.05, 20], [0.10, 50], [0.20, 80], [0.35, 100]],
  car:    [[0, 0], [0.125, 50], [0.20, 75], [0.50, 100]],
  roa:    [[-0.01, 0], [0, 25], [0.01, 55], [0.02, 80], [0.03, 100]],
  roe:    [[-0.05, 0], [0, 25], [0.05, 55], [0.10, 80], [0.15, 100]],
  losses: [[0, 100], [1, 50], [2, 0]],
  liq:    [[0.1, 0], [0.2, 10], [0.3, 40], [0.5, 70], [0.8, 100]],
  lcr:    [[0.5, 0], [1, 60], [1.5, 85], [2, 100]],
  ci:     [[0.3, 100], [0.45, 75], [0.6, 55], [0.8, 30], [1, 0]],
  fin:    [[0, 0], [0.1, 40], [0.25, 70], [0.4, 100]],
  dg:     [[-0.2, 0], [0, 50], [0.15, 80], [0.3, 100]],
}

export type Grade = 'excellent' | 'veryGood' | 'good' | 'fair' | 'weak'
/* Cut-offs (owner, 2026-10-02, option b): ممتاز from 78 and ضعيف below 45, so
   the top and bottom grades are reachable by real banks. */
export const gradeOf = (s: number): Grade => (s >= 78 ? 'excellent' : s >= 70 ? 'veryGood' : s >= 55 ? 'good' : s >= 45 ? 'fair' : 'weak')

/**
 * Why a bank has no grade, when the reason is the bank and not the data:
 * state banks publish no statements, foreign banks file abroad, a bank
 * under guardianship or in liquidation is not run on its statements, one
 * still being set up has none, a listed bank suspended from trading has
 * stopped filing, and an unlisted private bank files nowhere we read.
 */
export type Ungraded = 'state' | 'foreign' | 'guardianship' | 'liquidation' | 'establishment' | 'suspended' | 'unlisted'

export type BankScore = {
  ticker: string
  /** null when there is no grade; `reason` says why. */
  score: number | null
  grade: Grade | null
  reason: 'stale' | 'thin' | null
  /** The newest filing read, e.g. 2025 ANNUAL. */
  asOf: { year: number; period: string }
  pillars: Partial<Record<Pillar, number>>
  metrics: Partial<Record<Metric, number>>
  /** Share of listed banks this bank beats on each metric, 0–100. */
  rank: Partial<Record<Metric, number>>
}

/* Period end, as a sortable month index; interim fraction of a year. */
const END: Record<string, number> = { Q1: 3, Q2: 6, H1: 6, Q3: 9, Q4: 12, ANNUAL: 12 }
const YEAR_SHARE: Record<string, number> = { Q1: 0.25, Q2: 0.5, H1: 0.5, Q3: 0.75, Q4: 1, ANNUAL: 1 }
const monthIdx = (y: number, p: string) => y * 12 + (END[p] ?? 12)

function pw(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [a, sa] = pts[i - 1], [b, sb] = pts[i]
    if (x <= b) return sa + ((sb - sa) * (x - a)) / (b - a)
  }
  return pts[pts.length - 1][1]
}

type Filing = { y: number; p: string; m: number; v: Record<string, number> }

/** The raw metrics for one bank, or null when it has no usable filing. */
function metricsOf(filings: Filing[]): { asOf: Filing; m: Partial<Record<Metric, number>> } | null {
  if (!filings.length) return null
  const byNew = [...filings].sort((a, b) => b.m - a.m || (b.p === 'ANNUAL' ? 1 : 0) - (a.p === 'ANNUAL' ? 1 : 0))
  const asOf = byNew[0]
  const window = byNew.filter((f) => asOf.m - f.m <= 18)
  const stock = (k: string) => window.find((f) => f.v[k] != null)?.v[k]
  /* Flows: newest full-year filing in the window, else newest interim annualised. */
  const full = window.find((f) => (f.p === 'ANNUAL' || f.p === 'Q4') && f.v.net_income != null)
  const interim = window.find((f) => f.v.net_income != null)
  const flowSrc = full ?? interim
  const scale = flowSrc ? 1 / (YEAR_SHARE[flowSrc.p] ?? 1) : 1
  const flow = (k: string) => (flowSrc?.v[k] != null ? flowSrc.v[k] * scale : undefined)

  const A = stock('total_assets'), E = stock('total_equity'), D = stock('customer_deposits')
  const m: Partial<Record<Metric, number>> = {}
  if (!A || A <= 0) return { asOf, m }

  if (E != null && E / A > 0 && E / A <= 1) m.eq = E / A
  const car = stock('capital_adequacy_ratio')
  if (car != null && car > 0) { const r = car > 1.5 ? car / 100 : car; if (r < 10) m.car = r }

  const NI = flow('net_income')
  if (NI != null) {
    /* Average assets over the year where a year-earlier balance exists. */
    const prevA = byNew.find((f) => f.v.total_assets != null && Math.abs(asOf.m - 12 - f.m) <= 1)?.v.total_assets
    const avgA = prevA ? (A + prevA) / 2 : A
    if (Math.abs(NI / avgA) < 0.2) m.roa = NI / avgA
    if (E && E > 0 && Math.abs(NI / E) < 1) m.roe = NI / E
    const years = [...new Set(byNew.filter((f) => f.p === 'ANNUAL' || f.p === 'Q4').map((f) => f.y))].slice(0, 3)
    const annualNI = years.map((y) => byNew.find((f) => f.y === y && (f.p === 'ANNUAL' || f.p === 'Q4') && f.v.net_income != null)?.v.net_income)
    if (annualNI.some((v) => v != null)) m.losses = annualNI.filter((v) => v != null && v < 0).length
  }

  if (D && D > 0) {
    const liquid = (stock('cash_and_cbi') ?? 0) + (stock('due_from_banks') ?? 0)
    if (liquid > 0 && liquid / D < 20) m.liq = Math.min(liquid / D, 5)
    const prevD = byNew.find((f) => f.v.customer_deposits != null && Math.abs(asOf.m - 12 - f.m) <= 1)?.v.customer_deposits
    if (prevD && prevD > 0) { const g = D / prevD - 1; if (g > -0.9 && g < 5) m.dg = g }
  }
  const lcr = stock('lcr') ?? stock('nsfr')
  if (lcr != null && lcr > 0) m.lcr = lcr > 5 ? lcr / 100 : lcr

  const costs = flow('ga_expenses'), pretax = flow('pretax_income')
  if (costs != null && pretax != null) {
    const income = pretax + Math.abs(costs)
    if (income > 0) { const ci = Math.abs(costs) / income; if (ci < 5) m.ci = ci }
  }
  const fin = stock('islamic_financing')
  if (fin != null && fin >= 0 && fin / A <= 1) m.fin = fin / A
  return { asOf, m }
}

/**
 * Score every bank in `rows` against the others.
 * `today` is a month index (year*12 + month) — passed in so the function stays pure.
 */
export function scoreBanks(rows: FinRow[], today: number): Map<string, BankScore> {
  const by = new Map<string, Map<string, Filing>>()
  for (const r of rows) {
    if (r.value_iqd == null || !Number.isFinite(r.value_iqd)) continue
    const key = `${r.fiscal_year}|${r.period}`
    const t = by.get(r.ticker) ?? new Map<string, Filing>()
    const f = t.get(key) ?? { y: r.fiscal_year, p: r.period, m: monthIdx(r.fiscal_year, r.period), v: {} }
    f.v[r.line_key] = Number(r.value_iqd)
    t.set(key, f)
    by.set(r.ticker, t)
  }

  const raw = new Map<string, NonNullable<ReturnType<typeof metricsOf>>>()
  for (const [t, fs] of by) { const x = metricsOf([...fs.values()]); if (x) raw.set(t, x) }

  /* Peer distributions, from banks that are not stale. */
  const fresh = [...raw.entries()].filter(([, x]) => today - x.asOf.m <= 18)
  const dist = new Map<Metric, number[]>()
  for (const [, x] of fresh) for (const [k, v] of Object.entries(x.m) as [Metric, number][]) {
    const a = dist.get(k) ?? []; a.push(v); dist.set(k, a)
  }
  for (const a of dist.values()) a.sort((p, q) => p - q)
  const rankOf = (k: Metric, v: number) => {
    const a = dist.get(k) ?? []
    if (a.length < 2) return 50
    const below = a.filter((x) => x < v).length
    const r = (below / (a.length - 1)) * 100
    return LOWER_BETTER.has(k) ? 100 - r : r
  }

  const out = new Map<string, BankScore>()
  for (const [t, x] of raw) {
    const rank: BankScore['rank'] = {}
    const per: Partial<Record<Pillar, number[]>> = {}
    for (const [k, v] of Object.entries(x.m) as [Metric, number][]) {
      const abs = pw(v, T[k])
      const peers = (dist.get(k)?.length ?? 0) >= 8 && k !== 'losses'
      rank[k] = Math.round(rankOf(k, v))
      const s = peers ? 0.5 * abs + 0.5 * rankOf(k, v) : abs
      ;(per[PILLAR_OF[k]] ??= []).push(s)
    }
    const pillars: BankScore['pillars'] = {}
    for (const p of PILLARS) { const a = per[p]; if (a?.length) pillars[p] = Math.round(a.reduce((s, v) => s + v, 0) / a.length) }
    const have = PILLARS.filter((p) => pillars[p] != null)
    const stale = today - x.asOf.m > 18
    const thin = have.length < 3
    let score: number | null = null
    if (!stale && !thin) {
      const w = have.reduce((s, p) => s + WEIGHT[p], 0)
      score = Math.round(have.reduce((s, p) => s + pillars[p]! * WEIGHT[p], 0) / w)
    }
    out.set(t, {
      ticker: t, score, grade: score == null ? null : gradeOf(score),
      reason: stale ? 'stale' : thin ? 'thin' : null,
      asOf: { year: x.asOf.y, period: x.asOf.p }, pillars, metrics: x.m, rank,
    })
  }
  return out
}
