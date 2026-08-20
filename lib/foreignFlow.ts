import { PERIODS, type PeriodId } from '@/lib/statistics'

/**
 * The foreign-flow model — ONE definition, shared by the homepage, the
 * statistics hub and `/statistics/foreign-flow`.
 *
 * ══ THE SOURCE ═══════════════════════════════════════════════════════════
 * `foreign_flow_company_daily` — one row per (date, ticker, side), written
 * from the «اجانب» sheet of the daily trading bulletin. 28,381 rows,
 * 2010-03-29 → 2026-08-20.
 *
 * `foreign_flow_daily` looks like the natural session-level table and is not
 * one: it stops at 2026-07-30, starts at 2022-08-01, and disagrees with the
 * per-company table on 60 of their 915 shared sessions. It appears here ONLY
 * as a zero-proof oracle (see `classify`), never as a value.
 *
 * ══ THE ARITHMETIC ═══════════════════════════════════════════════════════
 *   buy   = Σ value where side = 'buy'
 *   sell  = Σ value where side = 'sell'
 *   net   = buy − sell          ← signed, always, on every surface
 *   gross = buy + sell          ← "activity"; never called net
 *
 * A window's totals are the sums of its sessions' buy and sell. Never a sum
 * of nets and never a sum of percentages.
 *
 * ══ THE ONE THING THE TABLE'S SHAPE TELLS US ═════════════════════════════
 * There is not a single NULL and not a single zero `value` in the table: the
 * parser writes a row only for real activity. So INSIDE a session that has
 * rows, absence is a provable zero — a company with a buy row and no sell row
 * sold nothing. OUTSIDE, a session with no rows at all proves nothing on its
 * own, which is what `classify` is for.
 *
 * See docs/FOREIGN_FLOW_DATA_MAP.md for the probes behind every claim above.
 */

/** One stored row, exactly as PostgREST returns it. */
export type FlowRow = {
  date: string
  ticker: string
  side: string
  value: number | null
  trades: number | null
}

/** One row of the zero-proof oracle, `foreign_flow_daily`. */
export type OracleRow = { date: string; side: string; value: number | null; companies: number | null }

/** A trading session's foreign flow. `net` is always `buy − sell`. */
export type FlowSession = {
  date: string
  buy: number
  sell: number
  net: number
  trades: number
  /** Distinct tickers with any foreign activity in the session. */
  companies: number
  /**
   * `observed` — the session carries company rows.
   * `zero`     — no company rows, and the oracle records 0 buy / 0 sell /
   *              0 companies for that date. A real zero, plotted as 0.
   * `missing`  — no company rows and no proof either way. Never plotted,
   *              never counted as zero.
   */
  kind: 'observed' | 'zero' | 'missing'
}

/**
 * Fold company rows into sessions over an explicit trading-session calendar.
 *
 * The calendar comes from `daily_index`, not from the flow rows themselves.
 * A window built out of "the dates that happen to carry flow rows" cannot
 * report its own gaps, and it also drifts away from the identical period on
 * /statistics, which windows over trading sessions.
 */
export function foldSessions(
  rows: FlowRow[],
  calendar: string[],
  oracle: OracleRow[] = [],
): FlowSession[] {
  const acc = new Map<string, { buy: number; sell: number; trades: number; co: Set<string> }>()
  for (const r of rows) {
    const e = acc.get(r.date) ?? { buy: 0, sell: 0, trades: 0, co: new Set<string>() }
    /* `?? 0` would be the wrong rule if this column ever held a null; it does
       not, and a null here would be a source defect to surface rather than to
       silently absorb. Rows with no value are dropped, not zeroed. */
    if (r.value != null) {
      if (r.side === 'buy') e.buy += r.value
      else e.sell += r.value
      e.co.add(r.ticker)
    }
    if (r.trades != null) e.trades += r.trades
    acc.set(r.date, e)
  }

  const zeroProof = new Set<string>()
  const byDate = new Map<string, { buy: number; sell: number; companies: number }>()
  for (const o of oracle) {
    const e = byDate.get(o.date) ?? { buy: 0, sell: 0, companies: 0 }
    if (o.side === 'buy') e.buy = o.value ?? 0
    else e.sell = o.value ?? 0
    e.companies += o.companies ?? 0
    byDate.set(o.date, e)
  }
  for (const [d, e] of Array.from(byDate.entries())) if (e.buy === 0 && e.sell === 0 && e.companies === 0) zeroProof.add(d)

  /* The calendar plus any flow date the calendar does not know about — two
     such dates exist (2014-01-21, 2014-03-16) and the observation is real, so
     dropping them would lose flow rather than reconcile them. */
  const dates = Array.from(new Set(calendar.concat(Array.from(acc.keys())))).sort()

  return dates.map((date) => {
    const e = acc.get(date)
    if (e) {
      return {
        date, buy: e.buy, sell: e.sell, net: e.buy - e.sell,
        trades: e.trades, companies: e.co.size, kind: 'observed' as const,
      }
    }
    const kind = zeroProof.has(date) ? ('zero' as const) : ('missing' as const)
    return { date, buy: 0, sell: 0, net: 0, trades: 0, companies: 0, kind }
  })
}

/** Sessions that carry a real observation — the only ones that may be summed. */
export const isCounted = (s: FlowSession) => s.kind !== 'missing'

/** The window is the last `n` TRADING sessions, gaps included and disclosed. */
export function flowWindow(all: FlowSession[], period: PeriodId): FlowSession[] {
  const n = PERIODS.find((p) => p.id === period)!.sessions
  return Number.isFinite(n) ? all.slice(-n) : all
}

export type FlowTotals = {
  buy: number
  sell: number
  net: number
  /** buy + sell — foreign activity, not direction. */
  gross: number
  /** Trading sessions in the window, gaps included. */
  sessions: number
  /** Sessions with a real observation (`observed` or proven `zero`). */
  counted: number
  /** Sessions with no observation and no proof. Never treated as zero. */
  missing: number
  buySessions: number
  sellSessions: number
  flatSessions: number
  trades: number
  /** First and last trading session of the window — not of the observations. */
  from: string
  to: string
}

export function flowTotals(rows: FlowSession[]): FlowTotals | null {
  if (!rows.length) return null
  const counted = rows.filter(isCounted)
  let buy = 0, sell = 0, trades = 0, up = 0, down = 0, flat = 0
  for (const s of counted) {
    buy += s.buy; sell += s.sell; trades += s.trades
    if (s.net > 0) up++
    else if (s.net < 0) down++
    else flat++
  }
  return {
    buy, sell, net: buy - sell, gross: buy + sell,
    sessions: rows.length, counted: counted.length, missing: rows.length - counted.length,
    buySessions: up, sellSessions: down, flatSessions: flat,
    trades,
    from: rows[0].date, to: rows[rows.length - 1].date,
  }
}

/* ── Buckets ──────────────────────────────────────────────────────────────
   «الكل» is 3,527 sessions and no plot can show them, so long windows are
   summed and the bucket unit is always printed — a monthly total and a
   session total are different quantities and nothing about a column's shape
   says which one is on screen. */

export type FlowGrain = 'session' | 'week' | 'month' | 'year'

export const FLOW_GRAIN_LABEL: Record<FlowGrain, string> = {
  session: 'يومي · كل عمود جلسة',
  week: 'أسبوعي · كل عمود مجموع أسبوع',
  month: 'شهري · كل عمود مجموع شهر',
  year: 'سنوي · كل عمود مجموع سنة',
}

export function flowGrainFor(period: PeriodId): FlowGrain {
  if (period === '1M' || period === '3M') return 'session'
  if (period === '6M' || period === '1Y') return 'week'
  if (period === '3Y' || period === '5Y') return 'month'
  return 'year'
}

export type FlowBucket = {
  key: string
  from: string
  to: string
  buy: number
  sell: number
  /** `null` when the bucket holds no observation at all — a hole, not a zero. */
  net: number | null
  /** Running net across the WINDOW. `null` only before the first observation. */
  cum: number | null
  /** Sessions with an observation. */
  n: number
  /** Sessions in the bucket with no observation and no proof. */
  missing: number
}

export function flowBuckets(rows: FlowSession[], grain: FlowGrain): FlowBucket[] {
  const keyOf = (iso: string) => {
    if (grain === 'year') return iso.slice(0, 4)
    if (grain === 'month') return iso.slice(0, 7)
    if (grain === 'session') return iso
    const d = new Date(iso + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    return d.toISOString().slice(0, 10)
  }

  const out: FlowBucket[] = []
  for (const s of rows) {
    const k = keyOf(s.date)
    let b = out[out.length - 1]
    if (!b || b.key !== k) {
      b = { key: k, from: s.date, to: s.date, buy: 0, sell: 0, net: null, cum: null, n: 0, missing: 0 }
      out.push(b)
    }
    b.to = s.date
    if (isCounted(s)) { b.buy += s.buy; b.sell += s.sell; b.n++ }
    else b.missing++
  }

  /* Cumulative: the running sum of the window's observed net, starting at 0
     at the window's first observation — never at the start of the record, and
     never restarted silently. A bucket with no observation carries the running
     balance forward unchanged rather than contributing a zero. */
  let run: number | null = null
  for (const b of out) {
    if (b.n > 0) {
      b.net = b.buy - b.sell
      run = (run ?? 0) + b.net
    }
    b.cum = run
  }
  return out
}

/* ── Company level ────────────────────────────────────────────────────────
   The same rows, grouped by ticker instead of by date, so the ranking sums
   to the window totals by construction. Nothing is scaled and no residual
   «أخرى» bucket is invented. */

export type CompanyFlow = {
  ticker: string
  name: string
  /** Curated sector code, or null when the ticker is not in the roster. */
  sec: string | null
  logo: string
  buy: number
  sell: number
  net: number
  trades: number
  /** (buy + sell) ÷ the window's gross foreign activity. */
  share: number
}

export type Roster = Map<string, { name?: string; sec?: string; logo?: string }>

export function companyFlows(rows: FlowRow[], from: string, to: string, roster: Roster): CompanyFlow[] {
  const acc = new Map<string, CompanyFlow>()
  for (const r of rows) {
    if (r.date < from || r.date > to) continue
    const meta = roster.get(r.ticker)
    const e = acc.get(r.ticker) ?? {
      ticker: r.ticker,
      name: meta?.name || r.ticker,
      sec: meta?.sec ?? null,
      logo: meta?.logo ?? '',
      buy: 0, sell: 0, net: 0, trades: 0, share: 0,
    }
    if (r.value != null) {
      if (r.side === 'buy') e.buy += r.value
      else e.sell += r.value
    }
    if (r.trades != null) e.trades += r.trades
    e.net = e.buy - e.sell
    acc.set(r.ticker, e)
  }
  const list = Array.from(acc.values())
  const gross = list.reduce((a, c) => a + c.buy + c.sell, 0)
  if (gross > 0) for (const c of list) c.share = (c.buy + c.sell) / gross
  return list
}

/* Four views, not one. A single descending net ranking cut to ten rows shows
   only the names foreigners accumulated and hides every name they were
   leaving — which is half the question this page exists to answer. */
export const COMPANY_VIEWS = [
  { id: 'netIn', label: 'أكبر صافي شراء' },
  { id: 'netOut', label: 'أكبر صافي بيع' },
  { id: 'buy', label: 'أكبر شراء' },
  { id: 'sell', label: 'أكبر بيع' },
] as const
export type CompanyView = (typeof COMPANY_VIEWS)[number]['id']

export const isNetView = (v: CompanyView) => v === 'netIn' || v === 'netOut'

export const viewValue = (c: CompanyFlow, v: CompanyView) =>
  isNetView(v) ? c.net : v === 'buy' ? c.buy : c.sell

/** Rank for a view, dropping the companies with nothing on that side — a zero
 *  row would claim foreigners looked at the name and passed. */
export function rankCompanies(rows: CompanyFlow[], view: CompanyView): CompanyFlow[] {
  const keep = rows.filter((c) =>
    view === 'netIn' ? c.net > 0
      : view === 'netOut' ? c.net < 0
        : view === 'buy' ? c.buy > 0
          : c.sell > 0)
  if (view === 'netIn') keep.sort((a, b) => b.net - a.net)
  else if (view === 'netOut') keep.sort((a, b) => a.net - b.net)
  else if (view === 'buy') keep.sort((a, b) => b.buy - a.buy)
  else keep.sort((a, b) => b.sell - a.sell)
  return keep
}

/* ── Sector level ─────────────────────────────────────────────────────────
   Aggregated from the company rows rather than read from `foreign_flow_sector`
   — that table is monthly, so it cannot follow a session window, and for
   2026-07 it under-reports Banks buy by 1.48B against the rows it should sum.
   It is used to VALIDATE this aggregation, never to feed it. */

export type SectorFlow = {
  id: string
  label: string
  buy: number
  sell: number
  net: number
  companies: number
  share: number
}

export function sectorFlows(rows: CompanyFlow[], labels: Map<string, string>): SectorFlow[] {
  const by = new Map<string, SectorFlow>()
  for (const c of rows) {
    const id = c.sec ?? 'UNMAPPED'
    const e = by.get(id) ?? {
      id,
      label: c.sec ? (labels.get(c.sec) ?? c.sec) : 'غير مصنّف',
      buy: 0, sell: 0, net: 0, companies: 0, share: 0,
    }
    e.buy += c.buy; e.sell += c.sell; e.companies++
    by.set(id, e)
  }
  const list = Array.from(by.values())
  const gross = list.reduce((a, s) => a + s.buy + s.sell, 0)
  for (const s of list) {
    s.net = s.buy - s.sell
    s.share = gross > 0 ? (s.buy + s.sell) / gross : 0
  }
  return list.sort((a, b) => b.buy + b.sell - (a.buy + a.sell))
}
