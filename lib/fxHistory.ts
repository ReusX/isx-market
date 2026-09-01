/**
 * Reading the FX record: history, change over period, and the spread.
 *
 * Everything here is derived from `fx_observations` through the `fx_daily`
 * view. Nothing is computed from `rates_cache`, which holds one row and knows
 * nothing about the past.
 *
 * ── Two honesty rules the callers depend on ───────────────────────────────
 * 1. A change figure needs two real observations. If the window has one point,
 *    or none, the answer is `null` — never zero. Zero means "the rate did not
 *    move", which is a finding; null means "we cannot say", which is the truth
 *    when there is nothing to compare against.
 * 2. `origin` travels with every point. The official series reaches back to
 *    2003 because the Central Bank published it; the parallel series begins
 *    when this system started recording. A chart that joins them without
 *    marking the seam implies we were watching a market we were not.
 */

import { spreadOf, type FxOrigin, type FxSeries } from '@/lib/fxSeries'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export interface FxDay {
  date: string
  open: number | null
  close: number | null
  high: number | null
  low: number | null
  buy: number | null
  sell: number | null
  origin: FxOrigin
  observations: number
}

export interface FxStats {
  latest: FxDay | null
  changeToday: number | null
  change7d: number | null
  change30d: number | null
  high: number | null
  low: number | null
  /** First and last day actually held, so the UI can state the real span
   *  rather than the span the period button asked for. */
  from: string | null
  to: string | null
  /** Days in this window that we recorded ourselves, vs imported. Lets the
   *  page say «مرصود» honestly instead of implying we watched it all. */
  recordedDays: number
  importedDays: number
}

/**
 * Bare PostgREST rather than the Supabase server client, for the same reason
 * `lib/freshness.ts` does it: that client reads `cookies()`, which opts the
 * route out of static rendering entirely.
 */
async function q<T>(path: string, revalidate = 900): Promise<T[]> {
  if (!URL_BASE || !ANON) return []
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      next: { revalidate },
    })
    if (!res.ok) return []
    return (await res.json()) as T[]
  } catch {
    return []
  }
}

/**
 * PostgREST caps a response at 1,000 rows regardless of `limit`, so a single
 * request for the official series returned 2003–2023 and looked complete: the
 * chart would have ended three years early with nothing saying so. Walk the
 * range until a page comes back short — the same approach the foreign-flow
 * loader uses against the same cap.
 */
async function qAll<T>(path: string, revalidate = 900, cap = 20_000): Promise<T[]> {
  if (!URL_BASE || !ANON) return []
  const out: T[] = []
  for (let off = 0; off < cap; off += 1000) {
    try {
      const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          Range: `${off}-${off + 999}`,
          'Range-Unit': 'items',
        },
        next: { revalidate },
      })
      if (!res.ok) break
      const rows = (await res.json()) as T[]
      out.push(...rows)
      if (rows.length < 1000) break
    } catch {
      break
    }
  }
  return out
}

type Row = {
  observed_date: string
  open: number | null
  close: number | null
  high: number | null
  low: number | null
  buy_close: number | null
  sell_close: number | null
  origin: FxOrigin
  observations: number
}

const toDay = (r: Row): FxDay => ({
  date: r.observed_date,
  open: r.open, close: r.close, high: r.high, low: r.low,
  buy: r.buy_close, sell: r.sell_close,
  origin: r.origin, observations: r.observations,
})

/** Daily series for one quantity, oldest first. */
export async function fxSeries(
  series: FxSeries,
  { location = 'baghdad', from, limit = 8000 }: { location?: string; from?: string; limit?: number } = {},
): Promise<FxDay[]> {
  const filter = from ? `&observed_date=gte.${from}` : ''
  const rows = await qAll<Row>(
    `fx_daily?series=eq.${series}&location=eq.${location}${filter}` +
    `&select=observed_date,open,close,high,low,buy_close,sell_close,origin,observations` +
    `&order=observed_date.asc`,
    900,
    limit,
  )
  return rows.map(toDay)
}

/** The most recent observation of a series, whatever its date. */
export async function fxLatest(series: FxSeries, location = 'baghdad'): Promise<FxDay | null> {
  const rows = await q<Row>(
    `fx_daily?series=eq.${series}&location=eq.${location}` +
    `&select=observed_date,open,close,high,low,buy_close,sell_close,origin,observations` +
    `&order=observed_date.desc&limit=1`,
    300,
  )
  return rows.length ? toDay(rows[0]) : null
}

/** Change between the last point and the last point at or before `daysAgo`. */
function changeOver(days: FxDay[], daysAgo: number): number | null {
  if (days.length < 2) return null
  const last = days[days.length - 1]
  if (last.close == null) return null
  const cutoff = new Date(last.date)
  cutoff.setUTCDate(cutoff.getUTCDate() - daysAgo)
  const iso = cutoff.toISOString().slice(0, 10)
  let prior: FxDay | null = null
  for (const d of days) {
    if (d.date <= iso && d.close != null) prior = d
    else if (d.date > iso) break
  }
  /* No point old enough is not a zero change — it is an unanswerable
     question, and saying 0% would be a claim we cannot support. */
  if (!prior || prior.close == null) return null
  return last.close - prior.close
}

export function statsFrom(days: FxDay[]): FxStats {
  const withClose = days.filter((d) => d.close != null)
  const latest = days.length ? days[days.length - 1] : null
  const closes = withClose.map((d) => d.close as number)
  return {
    latest,
    /* "Today" is the step from the previous observation, not a calendar day —
       the source does not publish every day, and pretending otherwise would
       show a null on every weekend. */
    changeToday:
      withClose.length >= 2
        ? (withClose[withClose.length - 1].close as number) - (withClose[withClose.length - 2].close as number)
        : null,
    change7d: changeOver(withClose, 7),
    change30d: changeOver(withClose, 30),
    high: closes.length ? Math.max(...withClose.map((d) => d.high ?? (d.close as number))) : null,
    low: closes.length ? Math.min(...withClose.map((d) => d.low ?? (d.close as number))) : null,
    from: days.length ? days[0].date : null,
    to: latest?.date ?? null,
    recordedDays: days.filter((d) => d.origin === 'recorded').length,
    importedDays: days.filter((d) => d.origin === 'imported').length,
  }
}

/**
 * The headline spread, on the one definition in lib/fxSeries.ts: parallel
 * midpoint against the CBI-published rate.
 *
 * Both sides must be observed. If the official series has no point on or
 * before the parallel one, the answer is null — a spread computed against a
 * hardcoded assumption is exactly what this rewrite exists to remove.
 */
export async function currentSpread(): Promise<{ abs: number; pct: number; parallel: number; official: number; officialDate: string } | null> {
  const [par, off] = await Promise.all([fxLatest('parallel'), fxLatest('official_cbi')])
  if (!par?.close || !off?.close) return null
  const s = spreadOf(par.close, off.close)
  return s ? { ...s, parallel: par.close, official: off.close, officialDate: off.date } : null
}
