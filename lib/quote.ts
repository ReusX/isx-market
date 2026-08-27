/**
 * Server-side quote for a single ticker.
 *
 * Exists so a company page can put an actual PRICE into the HTML a crawler
 * receives. Everything price-shaped on the site is fetched in the browser, so
 * the server-rendered company page contained no number at all — which is why
 * the SERP snippet for HBAY was a scraped ratios table rather than a share
 * price, and why the FAQ answer to "كم سعر سهم … اليوم؟" was a promise that the
 * price exists somewhere rather than the price.
 *
 * Bare `fetch` against PostgREST rather than the Supabase server client: that
 * one reads `cookies()`, which would opt the route out of caching entirely.
 */
import { STALE_DAYS } from '@/lib/listing'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export interface Quote {
  /** Last traded price in IQD. */
  close: number
  /** Percent change against the previous trade. Null when there is no prior. */
  pct: number | null
  /** ISO date of the session that price is from. */
  date: string
  /** Days between that session and now. */
  daysSince: number
  /** True when the price is too old to present as current (see STALE_DAYS). */
  suspended: boolean
}

const DAY_MS = 86_400_000

export async function getQuote(sym: string): Promise<Quote | null> {
  if (!URL_BASE || !ANON) return null
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/daily_prices?select=date,close&ticker=eq.${encodeURIComponent(sym)}` +
        `&close=gt.0&order=date.desc&limit=2`,
      {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        // Prices move once a day, on the bulletin. Half an hour bounds how long
        // a stale number can sit in a meta description.
        next: { revalidate: 1800 },
      },
    )
    if (!res.ok) return null
    const rows = (await res.json()) as { date: string; close: number }[]
    if (!rows?.length) return null

    const [last, prev] = rows
    const daysSince = Math.max(0, Math.round((Date.now() - new Date(last.date).getTime()) / DAY_MS))

    return {
      close: last.close,
      // Between the last two TRADES, not the last two calendar sessions — for a
      // thin name those differ, and the trade-to-trade move is the real one.
      pct: prev?.close ? ((last.close - prev.close) / prev.close) * 100 : null,
      date: last.date,
      daysSince,
      suspended: daysSince > STALE_DAYS,
    }
  } catch {
    // The page renders fine without it; the price simply stays out of the copy.
    return null
  }
}

/**
 * "16.06 دينار، بارتفاع 1.89%" — direction as an Arabic word, never a +/- sign.
 *
 * A signed number inside Arabic text gets its sign thrown to the wrong end by
 * bidi reordering, and a meta description has no `<bdi>` to fix it with. Words
 * are immune and read better besides.
 */
export function describeQuote(q: Quote, locale: 'ar' | 'en' = 'ar'): string {
  const n = q.close.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const price = locale === 'ar' ? `${n} دينار` : `${n} IQD`
  if (q.pct == null || Math.abs(q.pct) < 0.005) return price
  /* Direction as a WORD, never a bare sign: a leading «−» inside an Arabic
     sentence is reordered by bidi and can land against the wrong number. */
  const dir = locale === 'ar'
    ? (q.pct > 0 ? 'بارتفاع' : 'بانخفاض')
    : (q.pct > 0 ? 'up' : 'down')
  const sep = locale === 'ar' ? '، ' : ', '
  return `${price}${sep}${dir} ${Math.abs(q.pct).toFixed(2)}%`
}
